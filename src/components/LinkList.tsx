import './LinkList.css'
import {JSX} from "solid-js";

export interface LinkListItem {
    content: string | JSX.Element;
    href: string;

    children: LinkListItem[];
}


export interface LinkListProps {
    title?: string,
    items: LinkListItem[],
    // When true, nodes with children render as <details>/<summary> so the user
    // can expand/collapse branches. Leaves are unchanged.
    collapsible?: boolean,
    // Initial `open` state for the <details> elements created when collapsible.
    defaultOpen?: boolean,
}

function LinkAnchor(props: { item: LinkListItem, stopPropagation?: boolean }) {
    // Stop propagation so clicking the link inside a <summary> navigates
    // without also toggling the parent <details>.
    const onClick = props.stopPropagation
        ? (e: MouseEvent) => e.stopPropagation()
        : undefined;
    return typeof props.item.content === 'string'
        ? <a href={props.item.href} class={'link-primary'}
             innerHTML={props.item.content} onClick={onClick}/>
        : <a href={props.item.href} class={'link-primary'}
             onClick={onClick}>{props.item.content}</a>;
}

export function LinkList(props: LinkListProps) {
    return <div class={'link-list-container'}>
        { props.title? <h3>{props.title}</h3> : null }
        <ul class={'link-list'}>
            {props.items.map(item => {
                if (props.collapsible && item.children.length) {
                    return <li class={'link-list-item link-list-item-collapsible'}>
                        <details open={props.defaultOpen}>
                            <summary>
                                <LinkAnchor item={item} stopPropagation/>
                            </summary>
                            <LinkList items={item.children}
                                      collapsible
                                      defaultOpen={props.defaultOpen}/>
                        </details>
                    </li>;
                }
                return <li class={`link-list-item${props.collapsible ? ' link-list-item-leaf' : ''}`}>
                    <LinkAnchor item={item}/>
                    {
                        item.children.length ? <LinkList items={item.children}/> : null
                    }
                </li>;
            })}
        </ul>
    </div>
}


