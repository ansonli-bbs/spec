import {ParserLogger} from "./logging-base";
import {Macro, Node, Root} from "@unified-latex/unified-latex-types";
import {match} from "@unified-latex/unified-latex-util-match";
import path, {join} from "node:path";
import {readFile} from "node:fs/promises";
import {parse} from "@unified-latex/unified-latex-util-parse";
import {visit} from "@unified-latex/unified-latex-util-visit";
import {printRaw} from "@unified-latex/unified-latex-util-print-raw";

const packageCommands = ['usepackage', 'RequirePackage']
const inputCommands = ['input', 'include'];

// Store for raw tikzpicture source text, keyed by placeholder ID.
// tikzpicture content is extracted before parsing to prevent unified-latex
// from mangling TikZ-specific syntax (e.g. \foreach \x/\label in {...}).
export const tikzRawSources = new Map<number, string>();
let tikzCounter = 0;

function preserveTikzPictures(source: string): string {
    return source.replace(
        /\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g,
        (fullMatch) => {
            const id = tikzCounter++;
            tikzRawSources.set(id, fullMatch);
            return `\\begin{tikzpicture}__TIKZRAW_${id}__\\end{tikzpicture}`;
        }
    );
}

export class Loader {
    readonly visitedFiles: Set<string> = new Set();
    logger: ParserLogger;
    
    constructor({ logger }: {
        logger?: ParserLogger;
    }) {
        this.logger = logger ?? new ParserLogger({});
    }

    async processNodes(content: Node[], currentFile: string): Promise<Node[]> {
        const workingDirectory = path.dirname(currentFile);

        for (const node of content) {
            // Tag the node with source file position.
            visit(node, (n) => {
                if (!match.argument(n)) {
                    n.meta = {
                        sourceFile: currentFile,
                    };
                }
            })
        }


        return (await Promise.all(content.map(async (node: Node) => {
            const isPackageLoad = packageCommands.some((command: string) => match.macro(node, command));
            const isContentLoad = inputCommands.some((command: string) => match.macro(node, command));

            // Only process this if it's an input or an include.
            if (!isPackageLoad && !isContentLoad) {
                // However, also process the children of any environments.
                if (!match.anyEnvironment(node)) return [node];
                // In particular, the document environment will simply be unpacked.
                if (node.env === 'document') {
                    return await this.processNodes(node.content, currentFile);
                }

                return [{
                    ...node,
                    content: await this.processNodes(node.content, currentFile)
                }]
            }

            const inputCommand = node as Macro;

            const nodeLocation = {
                filePath: currentFile,
                ...node.position!!.start,
                content: printRaw(inputCommand)
            };

            // Input commands have their argument in position 0.
            if (isContentLoad) {
                if (!inputCommand.args || !inputCommand.args[0]) {
                    this.logger.error({
                        message: 'No arguments given to the input command.',
                        context: nodeLocation
                    });
                    return [];
                }
            } else {
                // Use package commands have extra options, so the argument is actually in position 1.
                if (!inputCommand.args || !inputCommand.args[1]) {
                    this.logger.error({
                        message: 'No arguments given to the import command.',
                        context: nodeLocation
                    });
                    return [];
                }
            }

            const fileNameArgument = inputCommand.args!![isContentLoad ? 0 : 1].content;
            if (!fileNameArgument) {
                this.logger.error({
                    message: 'No arguments given to the input command.',
                    context: nodeLocation
                });
                return [];
            }

            // From experiments, I should expect string nodes with contents.
            const fileName = fileNameArgument.map((piece) => piece.type === 'string' ? piece.content : '').join('');

            // Separate loading section here because in this case we can attribute any problem to the particular input command.
            let targetFile = join(workingDirectory, fileName);

            // Contents end with tex.
            if (isContentLoad) {
                if (!targetFile.endsWith('.tex')) {
                    targetFile = targetFile + '.tex';
                }
            } else {
                // Packages end with sty
                if (!targetFile.endsWith('.sty')) {
                    targetFile = targetFile + '.sty';
                }
            }

            if (this.visitedFiles.has(path.normalize(targetFile))) {
                if (isContentLoad) {
                    // Repeated content loads is a problem, so it gets an error.
                    this.logger.error({
                        message: `File ${targetFile} has already been visited once.`,
                        context: nodeLocation
                    });
                } else {
                    // But repeated package loads can just be skipped.
                    this.logger.warn({
                        message: `Package ${targetFile} has already been loaded.`,
                        context: nodeLocation
                    })
                }

                return [];
            }
            this.visitedFiles.add(path.normalize(targetFile));

            let fileContent = ""
            try {
                fileContent = await readFile(targetFile, { encoding: 'utf8' });
            } catch (e) {
                if (isContentLoad) {
                    // Failing a content load is a problem.
                    this.logger.error({
                        message: `Failed to read file ${targetFile}.`,
                        context: nodeLocation
                    });
                } else {
                    // But failing package loads is expected.
                    this.logger.warn({
                        message: `Failed to load package ${targetFile}. This compiler supports exactly zero TeX packages.`,
                        context: nodeLocation
                    });
                }
            }

            const root = parse(preserveTikzPictures(fileContent));

            return await this.processNodes(root.content, targetFile)
        }))).flat();
    }

    async process(file: string): Promise<Root> {
        let fileContent = ""
        try {
            fileContent = await readFile(file, { encoding: 'utf8' });
        } catch (e) {
            this.logger.error({
                message: `Failed to read file ${file}.`,
            });
        }

        // Record the file.
        this.visitedFiles.add(path.normalize(file));


        const root = parse(preserveTikzPictures(fileContent));

        return {
            ...root,
            content: await this.processNodes(root.content, file)
        }
    }
}