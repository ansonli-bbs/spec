import {DocumentVisitor} from "../visitor";
import {Node} from "@unified-latex/unified-latex-types";
import {VisitInfo} from "@unified-latex/unified-latex-util-visit";
import {match} from "@unified-latex/unified-latex-util-match";
import {BlockEnv} from "./block";
import {Division} from "./division";
import {ParserLogger} from "../logging-base";


export class BlockCollector extends DocumentVisitor {
    // Both works as a set that contains all the theorem types to keep track of, and a
    blockNames: Map<string, string>;
    blocks: Map<number, BlockEnv>; // Map from tags to the created IR nodes.

    // Macros that mark the beginning of particular divisions.
    // Used to assign parents to blocks.
    divisionMarkers: Set<string>;
    existingDivisions: Map<number, Division>;

    currentDivision?: Division;

    constructor({ blockNames, divisionMarkers, existingDivisions, logger }: {
        blockNames: Map<string, string>;
        divisionMarkers: Set<string>;
        existingDivisions: Map<number, Division>;
        logger?: ParserLogger;
    }) {
        super({ logger });

        this.blockNames = blockNames;
        this.blocks = new Map<number, BlockEnv>();

        this.divisionMarkers = divisionMarkers;
        this.existingDivisions = existingDivisions;
    }

    visit(node: Node, visitInfo: VisitInfo): void {
        // When encountering a division marker, set the current division to the division that it represents.
        if (match.anyMacro(node) && this.divisionMarkers.has(node.content)) {
            if (!node.meta || !node.meta.tag) {
                this.addWarning('Missing metadata for division.');
                return;
            }
            if (!this.existingDivisions.has(node.meta.tag)) {
                this.addWarning('Division is not yet collected.');
                return;
            }
            this.currentDivision = this.existingDivisions.get(node.meta.tag)!!;
            return;
        }

        if (!(match.anyEnvironment(node) && this.blockNames.has(node.env))) return;

        if (!node.meta || !node.meta.tag) {
            this.addError('Missing metadata for block.');
            return;
        }

        if (!this.currentDivision) {
            this.addWarning('No parent division is found for this block.');
        }

        const blockName = this.blockNames.get(node.env)!!;

        const blockEnv = new BlockEnv({
            name: blockName,
            title: node.meta.title ?? [],
            mainContent: [node],
            sourceNodeName: node.env,
            label: node.meta.label,
            tag: node.meta.tag,
            numbering: node.meta.numbering ?? [],
            proofs: node.meta.proofs ?? [],
            parent: this.currentDivision
        });

        for (const c of node.content) {
            blockEnv.assignAsParent(c);
        }
        for (const p of node.meta.proofs ?? []) {
            blockEnv.assignAsParent(p);
        }

        this.blocks.set(node.meta.tag, blockEnv);
    }
}

