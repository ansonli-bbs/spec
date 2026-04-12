// Compile-time diagnostic metrics: timing per stage + counts of artifacts.
//
// Used by the Compiler and runCompiler to gather wall-clock and artifact data
// during a build, then format a single summary box at the end. The format
// method is pure (no console writes) so the caller decides how to print.
//
// Design goals: cheap to gather, no profiler, no async hooks, additive to
// the existing per-stage logger.report output (does not replace it).

export type CoarseStage =
    | 'load'
    | 'labels'
    | 'collect'
    | 'graphics'
    | 'render'
    | 'database';

export type FineStage =
    | 'loadFiles'
    | 'definitions'
    | 'labelsAndNumbers'
    | 'tags'
    | 'enumerateAdjust'
    | 'links'
    | 'blockMetadata'
    | 'divisions'
    | 'blocks'
    | 'parasitic'
    | 'references';

export type StageKey = CoarseStage | FineStage;

const COARSE_STAGE_ORDER: CoarseStage[] = [
    'load', 'labels', 'collect', 'graphics', 'render', 'database',
];

const COARSE_STAGE_LABEL: Record<CoarseStage, string> = {
    load:     'Load',
    labels:   'Labels & numbers',
    collect:  'Collect',
    graphics: 'Graphics',
    render:   'Render',
    database: 'Database',
};

const FINE_STAGE_ORDER: FineStage[] = [
    'loadFiles', 'definitions', 'labelsAndNumbers', 'tags',
    'enumerateAdjust', 'links', 'blockMetadata',
    'divisions', 'blocks', 'parasitic', 'references',
];

const FINE_STAGE_LABEL: Record<FineStage, string> = {
    loadFiles:        'Load files',
    definitions:      'Definitions',
    labelsAndNumbers: 'Labels & numbers',
    tags:             'Tags',
    enumerateAdjust:  'Enumerate adjust',
    links:            'Links',
    blockMetadata:    'Block metadata',
    divisions:        'Divisions',
    blocks:           'Blocks',
    parasitic:        'Parasitic envs',
    references:       'References',
};

// In verbose mode, the timing section interleaves fine + coarse stages so the
// user sees a complete chronological picture of every recorded stage.
const VERBOSE_STAGE_ORDER: StageKey[] = [
    'loadFiles',
    'definitions', 'labelsAndNumbers', 'tags',
    'enumerateAdjust', 'links', 'blockMetadata',
    'divisions', 'blocks', 'parasitic', 'references',
    'graphics', 'render', 'database',
];

const STAGE_LABEL: Record<StageKey, string> = {
    ...COARSE_STAGE_LABEL,
    ...FINE_STAGE_LABEL,
};


export class BuildMetrics {
    readonly verbose: boolean;

    private readonly stageMs = new Map<StageKey, number>();
    private readonly counts = new Map<string, number>();
    private readonly breakdowns = new Map<string, Map<string, number>>();

    private startedAt = 0;
    private totalMs = 0;

    constructor({ verbose = false }: { verbose?: boolean } = {}) {
        this.verbose = verbose;
    }

    start() {
        this.startedAt = performance.now();
    }
    finish() {
        this.totalMs = performance.now() - this.startedAt;
    }

    // Wraps a stage; works for both sync and async functions.
    // Reentrant per stage: subsequent calls accumulate.
    async time<T>(stage: StageKey, fn: () => Promise<T> | T): Promise<T> {
        const t0 = performance.now();
        try {
            return await fn();
        } finally {
            const elapsed = performance.now() - t0;
            this.stageMs.set(stage, (this.stageMs.get(stage) ?? 0) + elapsed);
        }
    }

    set(key: string, value: number) {
        this.counts.set(key, value);
    }
    increment(key: string, by: number = 1) {
        this.counts.set(key, (this.counts.get(key) ?? 0) + by);
    }
    get(key: string): number {
        return this.counts.get(key) ?? 0;
    }

    // Per-environment breakdown for --verbose mode (e.g., theorems by env name).
    setBreakdown(key: string, breakdown: Map<string, number>) {
        this.breakdowns.set(key, breakdown);
    }

    // Renders a fixed-shape summary block. Pure: no console writes.
    format({ errors, warnings }: { errors: number; warnings: number }): string {
        const lines: string[] = [];
        const labelCol = 26;        // width reserved for label text
        const valueCol = 8;         // width reserved for the right-aligned value

        const horizontal = '─'.repeat(labelCol + valueCol + 4);
        const titleBar = (() => {
            const title = ' Compile Summary ';
            const sideLen = Math.max(0, Math.floor((horizontal.length - title.length) / 2));
            const side = '─'.repeat(sideLen);
            const result = side + title + side;
            // Pad to exact width if rounding came up short.
            return result.length < horizontal.length
                ? result + '─'.repeat(horizontal.length - result.length)
                : result;
        })();

        const padLabel = (label: string) => label.padEnd(labelCol);
        const padValue = (value: string) => value.padStart(valueCol);
        const row = (label: string, value: string, extra?: string) =>
            `  ${padLabel(label)}${padValue(value)}${extra ? '  ' + extra : ''}`;

        lines.push(titleBar);

        // ── Time ───────────────────────────────────────────────────────────
        lines.push('Time');
        lines.push(row('Total', formatMs(this.totalMs)));
        const stageList: StageKey[] = this.verbose ? VERBOSE_STAGE_ORDER : COARSE_STAGE_ORDER;
        const present = stageList.filter((s) => this.stageMs.has(s));
        present.forEach((stage, i) => {
            const isLast = i === present.length - 1;
            const glyph = isLast ? '└─ ' : '├─ ';
            lines.push(row(glyph + STAGE_LABEL[stage], formatMs(this.stageMs.get(stage)!)));
        });

        // ── Inputs ─────────────────────────────────────────────────────────
        const inputRows: Array<[string, number]> = [
            ['Tex files',           this.get('texFiles')],
            ['Bibliography entries', this.get('bibliography')],
        ];
        pushSection('Inputs', inputRows, lines, row);

        // ── Structure ──────────────────────────────────────────────────────
        const structureRows: Array<[string, number]> = [
            ['Parts',          this.get('parts')],
            ['Chapters',       this.get('chapters')],
            ['Sections',       this.get('sections')],
            ['Subsections',    this.get('subsections')],
            ['Subsubsections', this.get('subsubsections')],
        ];
        pushSection('Structure', structureRows, lines, row);

        // ── Content ────────────────────────────────────────────────────────
        const contentRows: Array<[string, number]> = [
            ['Theorems (blocks)',   this.get('theorems')],
            ['Equations',           this.get('equations')],
            ['Figures',             this.get('figures')],
            ['Custom environments', this.get('customEnvironments')],
            ['Custom macros',       this.get('customMacros')],
        ];
        pushSection('Content', contentRows, lines, row);
        if (this.verbose) {
            const breakdown = this.breakdowns.get('theorems');
            if (breakdown && breakdown.size > 0) {
                lines.push('  Theorems by type');
                const sorted = [...breakdown.entries()].sort((a, b) => b[1] - a[1]);
                sorted.forEach(([envName, count], i) => {
                    const isLast = i === sorted.length - 1;
                    const glyph = isLast ? '  └─ ' : '  ├─ ';
                    lines.push(row(glyph + envName, String(count)));
                });
            }
        }

        // ── Output ─────────────────────────────────────────────────────────
        const graphicsCopied = this.get('graphicsCopied');
        const graphicsSkipped = this.get('graphicsSkipped');
        const outputRows: Array<[string, number]> = [
            ['Units inserted/updated', this.get('unitsUpdated')],
            ['Units deleted',          this.get('unitsDeleted')],
        ];
        const outputHasAny = outputRows.some(([, v]) => v > 0) || graphicsCopied > 0;
        if (outputHasAny) {
            lines.push('');
            lines.push('Output');
            outputRows.forEach(([label, value]) => {
                if (value > 0) lines.push(row(label, String(value)));
            });
            if (graphicsCopied > 0 || graphicsSkipped > 0) {
                const extra = graphicsSkipped > 0 ? `(${graphicsSkipped} skipped)` : undefined;
                lines.push(row('Graphics copied', String(graphicsCopied), extra));
            }
        }

        // ── Diagnostics ────────────────────────────────────────────────────
        lines.push('');
        lines.push('Diagnostics');
        lines.push(row('Errors',   String(errors)));
        lines.push(row('Warnings', String(warnings)));

        lines.push(horizontal);
        return lines.join('\n');
    }
}


function pushSection(
    title: string,
    rows: Array<[string, number]>,
    lines: string[],
    row: (label: string, value: string, extra?: string) => string,
) {
    if (!rows.some(([, v]) => v > 0)) return;
    lines.push('');
    lines.push(title);
    for (const [label, value] of rows) {
        if (value > 0) lines.push(row(label, String(value)));
    }
}


function formatMs(ms: number): string {
    if (!isFinite(ms) || ms < 0) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
