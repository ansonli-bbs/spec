#!/usr/bin/env node

import { program } from "commander";
// @ts-ignore
import {CompilerOptionOverride, runCompiler} from "../src";
import AsyncLock from 'async-lock'
import chokidar from "chokidar";
import consola from "consola";


const version = "v0.2.1";


program.command('serve')
    .description('Start the server on the given port.')
    .option('-p, --port <port>', 'Port of the server', (val) => {
        const n = parseInt(val);
        if (isNaN(n)) throw new Error('Port must be an integer.');
        return n;
    }, 3000)
    .action(async (opts) => {
        consola.info(`Spec ${version}. Starting the server...`);
        
        process.env.PORT = String(opts.port);
        // @ts-ignore
        await import('../../.output/server/index.mjs');
    });

program.command('compile')
    .description('Compiles the website.')
    .option('--all', 'Force the compiler to rerender every unit, even those that have not changed since the last render.', false)
    .action(async (opts) => {
        consola.info(`Spec ${version}. Starting the compiler...`);
        
        await runCompiler({
            compileAll: opts.all
        });
    });

program.command('version')
    .description("Displays the current version.")
    .action(() => consola.info("Spec {version}"));


const compileLock = new AsyncLock({maxPending: 2});
function compile(options: CompilerOptionOverride, port: number) {
    compileLock.acquire('compile', () => runCompiler(options)).catch(() => {});
    fetch(`http://localhost:${port}/invalidate`, { method: 'POST' }).catch(() => {})
}

program.command('watch')
    .description('Starts the server on the given port, and will recompile the website whenever any change is detected in the current directory.')
    .option('-p, --port <port>', 'Port of the server', (val) => {
        const n = parseInt(val);
        if (isNaN(n)) throw new Error('Port must be an integer.');
        return n;
    }, 3000)
    .option('--conservative', 'Only compile files that change to maximise speed. Destroys the main page and will lead to broken links GLOBALLY. ', false)
    .option('--compileAll', 'Force the compiler to rerender every unit, even those that have already been compiled before. Disables conservative mode. ', false)
    .action(async (opts) => {
        process.env.PORT = String(opts.port);

        consola.info(`Spec ${version}. Watching the current directory...`);
        
        // @ts-ignore
        import('../../.output/server/index.mjs');

        function listener(path: string) {
            if (opts.conservative && !opts.compileAll && path.endsWith('.tex')) {
                compile({
                    compileAll: opts.compileAll,
                    targetFile: path,
                    conservative: true
                }, opts.port);
            } else {
                compile({
                    compileAll: opts.compileAll
                }, opts.port);
            }
        }

        chokidar.watch('.', {
            ignoreInitial: true,
            ignored: (path, stats) => !!stats?.isFile() && !/\.(tex|sty|bib)$/.test(path)
        }).on('add', listener)
            .on('change', listener)
            .on('unlink', () => compile({
            compileAll: opts.compileAll
        }, opts.port))
    })

program.parse();
