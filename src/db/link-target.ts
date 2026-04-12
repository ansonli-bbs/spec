export interface LinkTarget {
    tag: number;
    numberingText: string;
    unitType: string; // i.e. "thm"
    unitName: string; // i.e. "Theorem"

    // HTML title, if it exists.
    titleHtml?: string;

    // Children, if they exist.
    children?: LinkTarget[];
}


// Unit types that keep their name as a prefix in link labels (e.g. "Chapter 16: Title").
// All other types (section, subsection, theorems, …) drop the name because dotted
// numbering + indentation already communicate the hierarchy.
const LABELED_DIVIDER_TYPES = new Set(['document', 'part', 'chapter']);

export function linkHTML(target: LinkTarget) {
    if (LABELED_DIVIDER_TYPES.has(target.unitType)) {
        const prefix = target.numberingText
            ? `${target.unitName} ${target.numberingText}`
            : target.unitName;
        return target.titleHtml ? `${prefix}: ${target.titleHtml}` : prefix;
    }

    // Compact form: "16.1.1 Title", or just the title / unitName as fallback.
    if (target.numberingText) {
        return target.titleHtml
            ? `${target.numberingText} ${target.titleHtml}`
            : target.numberingText;
    }
    return target.titleHtml ?? target.unitName;
}
