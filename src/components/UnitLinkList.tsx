import {LinkList, LinkListItem} from "../components/LinkList";
import {linkHTML, LinkTarget} from "../db/link-target";
import {toTagString} from "../tag";

export interface UnitLinkListProps {
    title?: string,
    depth?: number,
    items: LinkTarget[],
    collapsible?: boolean,
    defaultOpen?: boolean,
}


function toLinkListItem(target: LinkTarget, depth: number): LinkListItem {
    return {
        content: linkHTML(target),
        href: `/t/${toTagString(target.tag)}`,
        children: depth > 0 && target.children && target.children.length > 0 ?
            target.children.map((c) => toLinkListItem(c, depth - 1)) : []
    };
}


export function UnitLinkList(props: UnitLinkListProps) {
    return <LinkList title={props.title}
                     items={props.items.map((t) => toLinkListItem(t, props.depth ?? 0))}
                     collapsible={props.collapsible}
                     defaultOpen={props.defaultOpen}/>
}

