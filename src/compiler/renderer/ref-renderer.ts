import {NodeRenderer} from "./renderer";
import {Macro, Node} from "@unified-latex/unified-latex-types";
import {match} from "@unified-latex/unified-latex-util-match";
import {htmlLike} from '@unified-latex/unified-latex-util-html-like';
import {classes} from "./classes";
import {toTagString} from "../../tag";
import {IRUnit} from "../grouping";
import {ParserLogger} from "../logging-base";
import {m, s} from "@unified-latex/unified-latex-builder";


const refCommands = new Set<string>(['ref', 'autoref', 'hyperref']);


export class RefRenderer extends NodeRenderer {
    inMathMode: boolean;
    tagUnitMap: Map<number, IRUnit>;
    constructor({ tagUnitMap, logger, inMathMode }: {
        tagUnitMap: Map<number, IRUnit>;
        logger: ParserLogger;
        inMathMode?: boolean;
    }) {
        super({logger});

        this.inMathMode = inMathMode ?? false;
        this.tagUnitMap = tagUnitMap;
    }

    getHrefContent(node: Macro) {
        return typeof node.refMeta?.text === 'string' ? [
            this.inMathMode ? m('text', s(node.refMeta.text)) : s(node.refMeta.text)
        ] : node.refMeta?.text ?? [];
    }

    renderParasitic(node: Macro, target: IRUnit) {
        const targetTagString = toTagString(target.tag);
        const href = `/t/${toTagString(target.parent?.tag ?? 0)}#${targetTagString}`;
        const hrefContent = this.getHrefContent(node);

        // In math mode use MathJax rules for hrefs.
        if (this.inMathMode) {
            const onClick = `(function() { if (document.getElementById("${targetTagString}")) {
                location.hash = "${targetTagString}";
            } else { 
                window.location.assign("${href}");
            }})()`

            return m('href', [
                s(`javascript:${onClick}`),
                {
                    type: 'argument',
                    openMark: '{', closeMark: '}',
                    content: hrefContent ?? [s('Unknown')],
                }
            ])
        }

        // Essentially, if the ID is already present in the current page, there's no need to navigate to the parent page.
        // Instead, I should just go to the tag immediately.
        const fallback = `
        if (document.getElementById("${targetTagString}")) {
            location.hash = "${targetTagString}";
            return false;
        }
        `;

        return htmlLike({
            tag: 'a',
            attributes: {
                href, class: classes.ref,
                onclick: fallback,
                // An additional helper property to help with hover previews.
                targetTag: targetTagString,
            },
            content: typeof node.refMeta?.text === 'string' ? {
                type: "string",
                content: node.refMeta.text
            } : node.refMeta?.text
        });
    }


    render(node: Node): Node | void {
        if (!(match.anyMacro(node) && refCommands.has(node.content))) return;
        if (!node.refMeta) {
            this.addWarning('Ref macro is missing metadata.');
            return;
        }

        const content = this.getHrefContent(node);

        if (node.refMeta.targetTag >= 0) {
            // If the tag refers to a parasitic unit, there will be a special handler.
            const targetNode = node.refMeta.targetTag ? this.tagUnitMap.get(node.refMeta.targetTag) : undefined;

            if (targetNode?.parasitic && targetNode.parent?.tag !== undefined) {
                return this.renderParasitic(node, targetNode);
            }

            const href = `/t/${toTagString(node.refMeta.targetTag)}`;

            if (this.inMathMode) {
                return m('href', [
                    s(`${href}`),
                    {
                        type: 'argument',
                        openMark: '{', closeMark: '}',
                        content,
                    }
                ]);
            }

            return htmlLike({
                tag: 'a',
                attributes: {
                    href,
                    class: classes.ref
                },
                content
            });
        }

        if (this.inMathMode) {
            return m('href', [
                s(`/404`),
                {
                    type: 'argument',
                    openMark: '{', closeMark: '}',
                    content,
                }
            ]);
        }

        return htmlLike({
            tag: 'a',
            attributes: {
                href: `/404`,
                class: classes.refInvalid
            },
            content
        });
    }
}

