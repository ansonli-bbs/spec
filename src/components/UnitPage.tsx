import {Page} from "../components/Page";
import {createAsync} from "@solidjs/router";
import {getConfig} from "../app-data";
import {mainPageType, shouldDisplayTitle} from "../unit-types";
import {tocDepthFor} from "../config";
import './UnitPage.css'
import {UnitLinkList} from "../components/UnitLinkList";
import {createEffect, createMemo, JSX, Show} from "solid-js";
import {UnitData} from "../db/unit-data";
import {FootnoteSection} from "./FootnoteSection";


export interface UnitPageProps {
    unit: UnitData;
    additionalSidebarContent?: JSX.Element | JSX.Element[] | string;
}

interface UnitSidebarContentProps extends UnitPageProps {
    // When true, the "Contents" TOC is wrapped in a collapsed <details>
    // (used for the mobile/thin sidebar variant).
    tocInDetails?: boolean;
    // When false/undefined, the TOC is omitted from the sidebar entirely
    // (used for part/document pages where the TOC lives in main content).
    showToc?: boolean;
    // TOC depth + default expansion state (sidebar variants only).
    tocDepth?: number;
    tocDefaultOpen?: boolean;
}

function UnitSidebarContent(props: UnitSidebarContentProps) {
    const tocList = () => props.showToc && props.unit.children && props.unit.children.length > 0
        ? <UnitLinkList title={'Contents'}
                        items={props.unit.children}
                        depth={props.tocDepth ?? 0}
                        collapsible
                        defaultOpen={props.tocDefaultOpen ?? true}/>
        : null;

    return <div class={'unit-sidebar-content'}>
        {
            props.showToc && props.unit.children && props.unit.children.length > 0 ?
                (props.tocInDetails
                    ? <details class={'mobile-toc-details'}>
                        <summary>Contents</summary>
                        {tocList()}
                    </details>
                    : tocList())
                : null
        }
        {props.unit.directlyReferences.length ? <UnitLinkList title={'Direct References'} items={props.unit.directlyReferences}/> : ''}
        {props.unit.indirectlyReferences.length ? <UnitLinkList title={'Indirect References'} items={props.unit.indirectlyReferences}/> : ''}
        {props.unit.directlyReferencedBy.length ? <UnitLinkList title={'Direct Backlinks'} items={props.unit.directlyReferencedBy}/> : ''}
        {props.unit.indirectlyReferencedBy.length ? <UnitLinkList title={'Indirect Backlinks'} items={props.unit.indirectlyReferencedBy}/> : ''}
        {
            props.additionalSidebarContent ?? null
        }
    </div>
}

export function UnitPage(props: UnitPageProps) {
    const config = createAsync(() => getConfig());

    const titleText = createMemo(() => {
        let titleText: string | undefined = props.unit.unitName;
        if (props.unit.numberingText) {
            titleText = titleText + ' ' + props.unit.numberingText;
        }
        if (props.unit.titleText) {
            titleText = titleText + ': ' + props.unit.titleText;
        }

        // No need to display the main title twice.
        if (props.unit.unitType !== mainPageType) {
            titleText = `${titleText} | ${config()?.siteTitle}`;
        } else {
            titleText = config()?.siteTitle;
        }

        return titleText;
    });

    const description = props.unit.contentText.slice(0, 50);

    // Part/document pages have no contentHTML — their TOC *is* the content,
    // so we keep it in main content (collapsed). All other pages move the TOC
    // into the sidebar.
    const isAllTocPage = createMemo(() => props.unit.contentHTML.trim().length === 0);

    const depth = createMemo(() => tocDepthFor(config(), props.unit.unitType));

    createEffect(() => {
        const _ = props.unit.tag;
        const mathJax = (window as any).MathJax;
        if (!mathJax) return;
        (mathJax.startup?.promise ?? Promise.resolve()).then(() => {
            mathJax.typesetClear();

            const preambleElement: HTMLScriptElement | null = document.querySelector('#preamble');
            if (preambleElement) {
                mathJax.tex2mml(preambleElement.innerText);
            }

            mathJax.typesetPromise();
        })
    });

    return <Show when={config()}>
        <Page titleText={titleText() ?? ''}
              displayTitle={shouldDisplayTitle(props.unit.unitType)}
              title={<span>
                     {props.unit.numberingText ? `${props.unit.numberingText} ` : null}<span innerHTML={props.unit.titleHTML ?? ''}/>
                 </span>}
              description={description}
              sidebarContent={<UnitSidebarContent {...props}
                                                  showToc={!isAllTocPage()}
                                                  tocDepth={depth()}
                                                  tocDefaultOpen={true}
                                                  tocInDetails={false}/>}
              thinSidebarContent={<UnitSidebarContent {...props}
                                                      showToc={!isAllTocPage()}
                                                      tocDepth={depth()}
                                                      tocDefaultOpen={true}
                                                      tocInDetails={true}/>}
              parentChain={props.unit.parentChain}>
            {
                props.unit.contentHTML.trim() ?
                    <div class={'unit-content-container'} innerHTML={props.unit.contentHTML}/> : null
            }
            {
                isAllTocPage() && props.unit.children && props.unit.children.length > 0 ?
                    <UnitLinkList items={props.unit.children}
                                  depth={depth()}
                                  collapsible
                                  defaultOpen={false}/> : null
            }
            <FootnoteSection footnotes={props.unit.footnotes ?? null}/>
        </Page>
    </Show>
}

