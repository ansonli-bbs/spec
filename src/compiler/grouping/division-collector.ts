import {Division} from "./division";
import {DocumentVisitor} from "../visitor";
import {Node} from "@unified-latex/unified-latex-types";
import {VisitInfo} from "@unified-latex/unified-latex-util-visit";
import {match} from "@unified-latex/unified-latex-util-match";
import {ParserLogger} from "../logging-base";


export class DivisionCollector extends DocumentVisitor {
    // Collection of all macros that initialise divisions.
    // It is assumed that the target division marker is an element of the division markers.
    divisionMarkers: Set<string>;
    // The macro that marks the beginning of the target division.
    targetDivisionMarker: string;
    // Cosmetic name for the target division type.
    divisionName: string;
    childDivisions: Set<string>;
    // Descendants correspond to children of children.
    // Seeing these will not interrupt the collection process.
    descendantDivisions: Set<string>;

    // All child divisions are assumed to be already collected in this map.
    // Children divisions will be collected into this.
    existingDivisions: Map<number, Division>;

    constructor({divisionMarkers, targetDivisionMarker, divisionName, childDivisions, descendantDivisions,
                    existingDivisions, logger}: {
        divisionMarkers: Set<string>;
        targetDivisionMarker: string;
        divisionName: string;
        childDivisions: Set<string>;
        descendantDivisions: Set<string>;
        existingDivisions?: Map<number, Division>;
        logger?: ParserLogger;
    }) {
        super({ logger });

        this.divisionMarkers = divisionMarkers;

        this.targetDivisionMarker = targetDivisionMarker;
        this.divisionName = divisionName;
        this.childDivisions = childDivisions;
        this.existingDivisions = existingDivisions ?? new Map<number, Division>();
        this.childDivisions = childDivisions;
        this.descendantDivisions = descendantDivisions;
    }

    visit(node: Node, visitInfo: VisitInfo): void {
        if (!match.macro(node, this.targetDivisionMarker)) return;
        if (!node.meta || !node.meta.tag) {
            this.addError('Missing metadata for division.');
            return;
        }

        // I will simply concatenate all the arguments to obtain the title.
        const title = node.args ? (
            node.args.flatMap((a) => a.content)
        ) : [];

        const divisionArgs = {
            sourceNodeName: this.targetDivisionMarker,
            name: this.divisionName,
            title: title,
            label: node.meta.label,
            tag: node.meta.tag,
            numbering: node.meta.numbering ?? [],
        }

        if (typeof visitInfo.index !== 'number' || !visitInfo.containingArray) {
            this.addWarning('Element has no siblings, and cannot receive content or children');
            this.existingDivisions.set(node.meta.tag, new Division({
                ...divisionArgs,
                mainContent: [],
                children: []
            }));
            return;
        }

        // Siblings of the marker will be collected as its content until another marker is reached.
        let collectContent = true;
        const mainContent: Node[] = [];
        const children: Division[] = [];
        for (const sibling of visitInfo.containingArray.slice(visitInfo.index + 1)) {
            if (match.anyMacro(sibling) && this.divisionMarkers.has(sibling.content)) {
                collectContent = false;
                // If this is a child division, attempt to collect it as a child.
                if (this.childDivisions.has(sibling.content)) {
                    if (!sibling.meta || !sibling.meta.tag) {
                        this.addError('Division marker is missing metadata.');
                        continue;
                    }
                    if (!this.existingDivisions.has(sibling.meta.tag)) {
                        this.addError('Division has not been collected yet.');
                        continue;
                    }
                    children.push(this.existingDivisions.get(sibling.meta.tag)!!);
                } else if (!this.descendantDivisions.has(sibling.content)) {
                    // Terminate the collecting if a non-descendant is seen.
                    break;
                }
            } else if (collectContent && !match.argument(sibling)) {
                // Otherwise, add the sibling to the content of the node.
                mainContent.push(sibling);
            }
        }

        const division = new Division({
            ...divisionArgs, mainContent
        });

        // Assign each child a parent IR unit.
        // Used for equations to figure out which page they belong to.
        // TODO: In the future, this assignment may be used for the block section.
        for (const c of mainContent) {
            division.assignAsParent(c);
        }

        for (const child of children) {
            division.addChild(child);
        }

        this.existingDivisions.set(node.meta.tag, division);
    }
}