import {ParserLogger} from "../logging-base";
import {Argument, Node} from "@unified-latex/unified-latex-types";
import {NodeContext, ParsingMessage} from "../error";
import {match} from "@unified-latex/unified-latex-util-match";
import {replaceNode} from '@unified-latex/unified-latex-util-replace';
import {getContext} from "../util";


export abstract class NodeRenderer {
    private currentContext?: NodeContext;
    logger: ParserLogger;
    
    constructor({ logger }: { logger?: ParserLogger }) {
        this.logger = logger ?? new ParserLogger({});
    }

    abstract render(node: Node): Node | null | void;

    addError(err: ParsingMessage | string) {
        if (typeof err === "string") {
            this.logger.error({
                context: this.currentContext,
                message: err
            });
        } else {
            this.logger.error({
                context: this.currentContext,
                ...err
            });
        }
    }
    addInfo(info: ParsingMessage | string) {
        if (typeof info === "string") {
            this.logger.info({
                context: this.currentContext,
                message: info
            });
        } else {
            this.logger.info({
                context: this.currentContext,
                ...info
            });
        }
    }
    addWarning(warning: ParsingMessage | string) {
        if (typeof warning === "string") {
            this.logger.warn({
                context: this.currentContext,
                message: warning
            });
        } else {
            this.logger.warn({
                context: this.currentContext,
                ...warning
            });
        }
    }

    process(input: Node): void {
        replaceNode(input, (node: Node | Argument) => {
            if (match.argument(node)) return;

            this.currentContext = getContext(node);

            return this.render(node);
        });
    }

    asPlugin(): () => (root: Node) => void {
        return () => ((root: Node) => this.process(root));
    }
}