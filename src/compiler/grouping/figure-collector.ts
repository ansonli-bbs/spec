import {DocumentVisitor} from "../visitor";
import {Node} from "@unified-latex/unified-latex-types";
import {VisitInfo} from "@unified-latex/unified-latex-util-visit";
import {ParserLogger} from "../logging-base";
import {match} from "@unified-latex/unified-latex-util-match";
import {Figure} from "./figure";


export class FigureCollector extends DocumentVisitor {
    figures: Map<number, Figure>; // Map from tags to the created IR nodes.

    constructor({ logger }: {
        logger?: ParserLogger;
    }) {
        super({ logger });

        this.figures = new Map<number, Figure>();
    }

    visit(node: Node, visitInfo: VisitInfo): void {
        if (!match.environment(node, "figure")) return;

        if (!node.meta || !node.meta.tag || !node.meta.parentIRUnit) {
            return;
        }

        this.figures.set(node.meta.tag, new Figure({
            environment: node,
            label: node.meta.label, numbering: node.meta.numbering, parent: node.meta.parentIRUnit,
            tag: node.meta.tag
        }));
    }
}

