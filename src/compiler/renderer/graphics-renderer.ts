import {NodeRenderer} from "./renderer";
import {Node} from "@unified-latex/unified-latex-types";
import {match} from "@unified-latex/unified-latex-util-match";
import {htmlLike} from "@unified-latex/unified-latex-util-html-like";
import path from "node:path";
import {graphicsURLRoot} from "../util";
import {pgfkeysArgToObject} from "@unified-latex/unified-latex-util-pgfkeys";
import {printRaw} from "@unified-latex/unified-latex-util-print-raw";


// The omitter simply removes certain macros from render.
export class GraphicsRenderer extends NodeRenderer {
    parseLengthOption(nodes: Node[]) {
        const inner = nodes.map((node) => {
            if (match.macro(node, 'linewidth')) return '* 100%';
            return printRaw(node);
        }).join('');

        return `calc(${inner})`;
    }


    render(node: Node): Node | void | null {
        if (!match.macro(node, "includegraphics")) return node;
        if (!node.meta?.targetFile) return node;

        const style: Record<string, string> = {};
        if (node.args && node.args.length > 3) {
            // The options for the image are in position 1, and in key-value format.
            const args = pgfkeysArgToObject(node.args[1]);

            if ('width' in args) {
                style['width'] = this.parseLengthOption(args['width']);
            }
            if ('height' in args) {
                style['height'] = this.parseLengthOption(args['height']);
            }
        }

        return htmlLike({
            tag: 'img',
            attributes: {
                src: path.join(graphicsURLRoot, node.meta.targetFile),
                style: Object.entries(style).map(([k, v]) => `${k}: ${v};`).join('')
            }
        });
    }
}
