import './Page.css'
import {ParentChainDisplay} from "./ParentChainDisplay";
import {createEffect, createMemo, createSignal, JSX, onCleanup, onMount} from "solid-js";
import {Meta, Title} from "@solidjs/meta";
import {Sidebar} from "./Sidebar";
import {createAsync, useLocation} from "@solidjs/router";
import {getConfig} from "../app-data";
import {LinkTarget} from "../db/link-target";
import {useDarkTheme} from "../theme";
import {Topbar} from "./Topbar";
import {githubLink} from "../about";
import {InvalidateListener} from "./InvalidateListener";
import {UnitPreview, UnitPreviewProps} from "./UnitPreview";


export interface PageProps {
    titleText: string;
    displayTitle: boolean;
    title?: JSX.Element | JSX.Element[] | string;
    children: JSX.Element | JSX.Element[] | string;
    description?: string;

    parentChain?: LinkTarget[];

    sidebarContent?: JSX.Element | JSX.Element[] | string;
}


export function Page(props: PageProps) {
    const config = createAsync(() => getConfig());
    const [darkTheme] = useDarkTheme();

    const primaryColourClass = createMemo(() => config() ? `primary-${config()?.website.primaryColour}` : 'primary-blue');
    const neutralColourClass = createMemo(() => config() ? `neutral-${config()?.website.neutralColour}` : 'neutral-grey');

    const fontSize = createMemo(() => config()?.website.fontSize ?? 16);
    const lineHeight = createMemo(() => config()?.website.lineHeight ?? 1.3);
    const lineWidth = createMemo(() => config()?.website.lineWidth ?? 45);
    const alignment = createMemo(() => config()?.website.textAlign ?? 'left');

    const [overLink, setOverLink] = createSignal(false);
    const [overPreview, setOverPreview] = createSignal(false);
    const [preview, setPreview] = createSignal<Omit<UnitPreviewProps, "setOverPreview"> | null>(null);
    const showPreview = () => (overLink() || overPreview()) && preview() !== null && !!config()?.website.hoverPreview;

    let bodyRef!: HTMLDivElement;

    createEffect(() => {
        (window as any).MathJax?.startup?.promise
            ?.then(() => (window as any).MathJax.typesetPromise());
    });

    let showTimeout: ReturnType<typeof setTimeout>;
    let hideTimeout: ReturnType<typeof setTimeout>;
    onMount(() => {
        void props;

        if (!bodyRef) return;

        function computeBoxPosition(mouseX: number, mouseY: number): { x: number; y: number, positionFromBottom: boolean } {
            const remPx = config()?.website.fontSize ?? 16;
            const lineWidthRem = config()?.website.lineWidth ?? 45; // e.g. 45 from "45rem"

            const boxW = 0.75 * lineWidthRem * remPx;
            const boxH = 0.5 * window.innerHeight;
            const gap = 12;

            let x = mouseX + gap;
            // Attempt to move the box left if necessary and there is room.
            if (mouseX + gap + boxW > window.innerWidth) {
                x = Math.max(gap, window.innerWidth - 2 * gap - boxW);
            }

            let bottom = false;
            // Attempt to move the box up if necessary and there is room.
            let y = mouseY + gap;
            if (mouseY + gap + boxH > window.innerHeight) {
                y = window.innerHeight - (mouseY - gap);
                bottom = true;
            }

            return { x, y, positionFromBottom: bottom };
        }

        const controllers: AbortController[] = [];

        function attachHandlers() {
            for (const link of bodyRef.querySelectorAll('a[href]')) {
                const href = link.getAttribute('href');

                if (!link.getAttribute('targetTag') && (!href || !href.startsWith('/t'))) continue;

                // Links are of the form /t/TAG#ID
                const tagString = link.getAttribute('targetTag') ?? (href!.split('/').pop()?.trim() ?? '').split('#')[0];

                const controller = new AbortController();

                link.addEventListener('mouseenter', (e: Event) => {
                    clearTimeout(hideTimeout);
                    if (overLink()) return;
                    showTimeout = setTimeout(() => {
                        setPreview({
                            tag: tagString,
                            ...computeBoxPosition((e as MouseEvent).clientX, (e as MouseEvent).clientY)
                        });
                        setOverLink(true);
                    }, 300);
                }, { signal: controller.signal });

                link.addEventListener('mouseleave', () => {
                    clearTimeout(showTimeout);
                    hideTimeout = setTimeout(() => {
                        setOverLink(false);
                    }, 300);
                }, { signal: controller.signal });
            }
        }

        const observer = new MutationObserver(attachHandlers);
        observer.observe(bodyRef, { childList: true, subtree: true });
        attachHandlers();

        onCleanup(() => {
            observer.disconnect();
            for (const controller of controllers) controller.abort();
        })
    });

    // Clean up the hover system when navigation happens.
    const location = useLocation();
    createEffect(() => {
        location.pathname; // track navigation
        setOverLink(false);
        setOverPreview(false);
        setPreview(null);
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);
    });

    return <div class={`main-container ${darkTheme() ? 'dark' : 'light'} ${primaryColourClass()} ${neutralColourClass()}`}
                style={{"--line-width": `${lineWidth()}rem`}}
    >
        <Meta property="og:title" content={props.titleText} />
        {
            props.description ? <Meta property="og:description" content={props.description} /> : null
        }

        <InvalidateListener/>

        <Title>{props.titleText}</Title>
        <div class={`page-container ${config()?.website.font} ${config()?.website.copyLabelButton ? '' : 'hide-copy-label'}`}
             style={{
                 "font-size": `${fontSize()}px`,
                 "line-height": `${lineHeight()}`,
                 "text-align": `${alignment()}`,
             }}>
            <Topbar/>
            {
                props.parentChain && props.parentChain.length ?
                    <ParentChainDisplay parentChain={props.parentChain ?? []}/> : null
            }
            <main class={'page-body'} ref={bodyRef}>
                <article class={'page-content-container'}>
                    {
                        props.displayTitle ? <h1 class={'page-title'}>
                            {props.title}
                        </h1> : null
                    }
                    <div class={'page-content'}>
                        {props.children}
                    </div>
                    <div class={'thin-sidebar-content'}>
                        {props.sidebarContent}
                        {
                            config()?.website.advertiseSpec ? <div class={'advertise-spec'}>
                                <a href={githubLink} target="_blank" rel="noopener noreferrer">Powered by Spec</a>
                            </div> : null
                        }
                    </div>
                </article>
                <Sidebar>
                    {props.sidebarContent}
                </Sidebar>
            </main>
        </div>
        { showPreview() ? <UnitPreview {...preview()!} setOverPreview={setOverPreview}/> : null }
    </div>
}