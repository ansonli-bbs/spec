import {IRUnit} from "./unit";
import {Node} from "@unified-latex/unified-latex-types";
import {printRaw} from "@unified-latex/unified-latex-util-print-raw";
import {RendererBuilder} from "../util";

// To reuse rendering code, the "mainContent" of a block will not be its content, but will just be the original node itself.
export class BlockEnv extends IRUnit {
    proofs: Node[];

    constructor(args: {
        parent?: IRUnit;
        mainContent: Node[];
        sourceNodeName: string;
        name: string;
        title?: Node[];
        label?: string;
        tag: number;
        numbering: number[];
        proofs: Node[];
    }) {
        super({
            ...args,
            sourceNodeType: "environment",
            parasitic: false,
            isDivision: false,
            additionalContent: args.proofs
        });

        this.proofs = args.proofs;
    }

    hashData(): Record<string, string> {
        return {
            ...super.hashData(),
            proofs: this.proofs.map((p) => printRaw(p)).join('\n')
        };
    }

    renderBody(builder: RendererBuilder): string {
        return this.buildRenderer(builder)({
            type: 'root',
            content: [
                ...this.mainContent,
                ...this.proofs
            ],
        })
    }
}

