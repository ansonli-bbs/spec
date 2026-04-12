import {z} from "zod";


export const SpecConfigSchema = z.object({
    database: z.string().default('spec.db'),
    document: z.string().default('document.tex'),
    siteTitle: z.string().default('Unnamed Website'),

    compiler: z.object({
        compileAll: z.boolean().default(false),
        redoTags: z.boolean().default(false),

        indirectReferences: z.boolean().default(true),
    }).prefault({}),

    website: z.object({
        font: z.enum(['roboto', 'open-sans', 'cmu-serif', 'cmu-sans-serif']).default('cmu-serif'),
        fontSize: z.int().min(1).default(16),
        lineHeight: z.float32().default(1.3),
        textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
        lineWidth: z.int().min(15).max(120).default(45),

        primaryColour: z.enum(['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
            'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']).default('blue'),
        neutralColour: z.enum(['slate', 'grey', 'zinc', 'stone']).default('grey'),

        searchLimit: z.int().min(1).default(16),
        maxSearchPages: z.int().min(1).default(48),

        recentChanges: z.int().min(0).max(32).default(10),
        tableOfContentsDepth: z.union([
            z.int().min(0).max(4),
            z.object({
                document: z.int().min(0).max(4).optional(),
                part: z.int().min(0).max(4).optional(),
                chapter: z.int().min(0).max(4).optional(),
                section: z.int().min(0).max(4).optional(),
                subsection: z.int().min(0).max(4).optional(),
                subsubsection: z.int().min(0).max(4).optional(),
                default: z.int().min(0).max(4).default(1),
            }),
        ]).default({
            document: 1,
            part: 1,
            chapter: 2,
            section: 1,
            subsection: 1,
            subsubsection: 1,
            default: 1,
        }),

        hoverPreview: z.boolean().default(true),
        copyLabelButton: z.boolean().default(false),

        advertiseSpec: z.boolean().default(true),
    }).prefault({})
});

export type SpecConfig = z.infer<typeof SpecConfigSchema>;

export const defaultConfig: SpecConfig = SpecConfigSchema.parse({});

export const defaultConfigPath = './spec.toml'

export let config: SpecConfig;

export function setConfig(newConfig: SpecConfig) {
    config = newConfig;
}

/**
 * Resolve the TOC depth for a given unit type, accepting either the legacy
 * integer form or the per-unit-type record form of `tableOfContentsDepth`.
 */
export function tocDepthFor(
    cfg: SpecConfig | undefined,
    unitType: string,
): number {
    const value = cfg?.website.tableOfContentsDepth;
    if (value === undefined) return 0;
    if (typeof value === 'number') return value;
    const perType = (value as Record<string, number | undefined>)[unitType];
    return perType ?? value.default;
}
