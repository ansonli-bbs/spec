import {NodeRenderer} from "./renderer";
import {Node} from "@unified-latex/unified-latex-types";
import {match} from "@unified-latex/unified-latex-util-match";
import {htmlLike} from "@unified-latex/unified-latex-util-html-like";
import {classes} from "./classes";
import {s} from '@unified-latex/unified-latex-builder';
import {wrapPars} from "@unified-latex/unified-latex-to-hast";
import {ParserLogger} from "../logging-base";
import {toTagString} from "../../tag";

export class BlockRenderer extends NodeRenderer {
    blockNames: Map<string, string>;

    constructor({blockNames, logger}: {blockNames: Map<string, string>, logger?: ParserLogger}) {
        super({ logger });

        this.blockNames = blockNames;
    }

    render(node: Node): Node | void {
        if (!(match.environment(node) && this.blockNames.has(node.env))) return;
        if (!node.meta) {
            this.addWarning('Block is missing metadata.');
            return;
        }

        const blockName = this.blockNames.get(node.env)!!;
        const blockTitle = node.meta.title ?? [];

        // Get rid of the first parbreak so lemma declarations and contents start in the same paragraph.
        if (node.content.length && match.parbreak(node.content[0])) {
            node.content.shift();
        }

        const onclickCopyLabel = `navigator.clipboard.writeText(${JSON.stringify(node.meta.label)})`;

        return htmlLike({
            tag: 'div',
            attributes: {
                class: classes.blockEnvironment,
            },
            content: wrapPars([
                htmlLike({
                    tag: 'a',
                    attributes: {
                        class: classes.blockTitle,
                        href: node.meta.tag ? `/t/${toTagString(node.meta.tag)}` : '',
                    },
                    content: htmlLike({
                        tag: 'strong',
                        content: [
                            s(node.meta.numbering && node.meta.numbering.length ?
                                `${blockName} ${node.meta.numbering.join('.')}` : blockName),
                            // If there is a block title, render it.
                            ...blockTitle.length ? [
                                s(' ('),
                                ...blockTitle,
                                s(')')
                            ] : [],
                            s('.')
                        ]
                    })
                }),
                htmlLike({
                    tag: 'a',
                    attributes: {
                        class: classes.copyLabel,
                        onclick: onclickCopyLabel,
                        title: 'Copy Label',
                        href: '#'
                    },
                    content: s('label')
                }),
                htmlLike({
                    tag: 'span',
                    content: s(' ')
                }),
                ...node.content
            ])
        })
    }
}