import {NodeRenderer} from "./renderer";
import {Node} from "@unified-latex/unified-latex-types";
import {match} from "@unified-latex/unified-latex-util-match";
import {htmlLike} from "@unified-latex/unified-latex-util-html-like";
import {classes} from "./classes";
import {s} from "@unified-latex/unified-latex-builder";


export class FootnoteRefRenderer extends NodeRenderer {
    render(node: Node): Node | void {
        if (!match.macro(node, 'footnote')) return;

        if (!node.meta?.numbering?.length) return;

        const footnoteNumber = node.meta.numbering[0];

        return htmlLike({
            tag: 'sup',
            content: htmlLike({
                tag: 'a',
                attributes: {
                    href: `#footnote-${footnoteNumber}`,
                    id: `footnote-${footnoteNumber}-ref`,
                    class: classes.footnoteRef,
                    footnoteNumber
                },
                content: s(`[${footnoteNumber}]`)
            })
        })
    }
}
