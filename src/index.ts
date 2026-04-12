import "./compiler/loader"
import {Compiler} from "./compiler/compiler";
import {BuildMetrics} from "./compiler/metrics";
import {AppDataSource, initialiseDatabase} from "./db";
import consola from "consola";
import {In} from "typeorm";
import {loadConfig} from "./load-config";
import {UnitData} from "./db/unit-data";
import {BibliographyData} from "./db/bib-data";
import {AuxData} from "./db/aux-data";
import {GraphicData} from "./db/graphic-data";


export interface CompilerOptionOverride {
    compileAll: boolean;
    conservative?: boolean;
    targetFile?: string;
    verbose?: boolean;
}


export async function runCompiler({compileAll, conservative, targetFile, verbose}: CompilerOptionOverride ) {
    const config = await loadConfig();
    if (!config) {
        process.exit(0);
    }

    config.compiler.compileAll = config.compiler.compileAll || compileAll;
    // Compile all will disable conservative mode.
    conservative = conservative && !compileAll;

    const metrics = new BuildMetrics({ verbose: verbose ?? false });
    metrics.start();

    await initialiseDatabase(config.database);

    const unitRepository = AppDataSource.getRepository(UnitData);
    const bibliographyRepository = AppDataSource.getRepository(BibliographyData);
    const graphicsDataRepository = AppDataSource.getRepository(GraphicData);

    let existingUnits: UnitData[] = [];
    let existingBibliography: BibliographyData[] = [];
    let existingGraphics: GraphicData[] = [];

    if (config.compiler.redoTags) {
        consola.info('Deleting all existing units from the database.');
        try {
            await unitRepository.deleteAll();
            await bibliographyRepository.deleteAll();
        } catch (e) {
            consola.error('Failed to delete units from the database.');
            console.error(e);
            process.exit(42);
        }
        consola.success(`Successfully deleted all existing units from the database.`);
    } else {
        consola.info('Loading units from the database.');
        try {
            existingUnits = await unitRepository.find({
                select: { tag: true, label: true, hash: true },
            });
            existingBibliography = await bibliographyRepository.find({
                select: { tag: true, key: true },
            });
            existingGraphics = await graphicsDataRepository.find({
                select: { path: true, hash: true },
            });
        } catch (e) {
            consola.error('Failed to load existing units from the database.');
            console.error(e);
            process.exit(43);
        }
        consola.success(`Loaded ${existingUnits.length} units from the database.`);
    }

    const unitLabelTags = new Map<string, number>(existingUnits.filter((u) => u.label)
        .map((u) => [u.label!, u.tag]));
    const unitTagHash = new Map<number, string>(existingUnits.map((u) => [u.tag, u.hash]));
    const bibliographyLabelTags = new Map<string, number>(existingBibliography.map((u) => [u.key, u.tag]));

    const graphicPathHash = new Map<string, string>(existingGraphics.map((g) => [g.path, g.hash]))

    const nextAvailableTag = 1 + Math.max(0,
        ...existingUnits.map((u) => u.tag),
        ...existingBibliography.map((u) => u.tag)
    );

    const parser = new Compiler({
        config,
        unitLabelTags,
        bibliographyLabelTags,
        nextAvailableTag,
        unitTagHash,
        graphicPathHash,
        conservative,
        metrics,
    });

    let result: Awaited<ReturnType<typeof parser.parseFile>> | undefined;
    let dbFailed = false;
    try {
        result = await parser.parseFile(targetFile ?? config.document);

        const r = result;
        await metrics.time('database', async () => {
            const upsertBatchSize = 500;

            consola.info(`Inserting/updating ${r.unitsToUpdate.length} units into the database.`);
            // On conflict, update all non-primary columns.
            const primaryColumns = unitRepository.metadata.columns
                .filter((c) => c.isPrimary).map((c) => c.databaseName);

            for (let i = 0; i < r.unitsToUpdate.length; i += upsertBatchSize) {
                await unitRepository.upsert(r.unitsToUpdate.slice(i, i + upsertBatchSize), primaryColumns);
            }

            // Only delete old units outside of conservative mode.
            if (!conservative) {
                consola.info(`Deleting ${r.unitsToDelete.length} units from the database.`);

                await unitRepository.delete({
                    tag: In(r.unitsToDelete)
                });
            }

            consola.info(`Inserting ${r.bibliography.length} bibliography entries.`)

            // Units should just be refreshed every time.
            await bibliographyRepository.deleteAll();
            for (let i = 0; i < r.bibliography.length; i += upsertBatchSize) {
                await bibliographyRepository.insert(r.bibliography.slice(i, i + upsertBatchSize));
            }

            consola.info('(Re)building the search index.')

            // SQLite supports fts5: https://sqlite.org/fts5.html
            await AppDataSource.query(`
            CREATE VIRTUAL TABLE IF NOT EXISTS units_fts
            USING fts5(contentText, content='units', content_rowid='tag');
            `);
            await AppDataSource.query(`
            INSERT INTO units_fts(units_fts) VALUES('rebuild');
            `);

            consola.info(`Updating ${r.graphicsToUpdate.length} graphics entries.`);
            for (let i = 0; i < r.graphicsToUpdate.length; i += upsertBatchSize) {
                await graphicsDataRepository.upsert(r.graphicsToUpdate.slice(i, i + upsertBatchSize), ['path']);
            }
            // Only delete old units outside of conservative mode.
            if (!conservative) {
                consola.info(`Deleting ${r.graphicsToDelete.length} graphics entries from the database.`);

                await graphicsDataRepository.delete({
                    path: In(r.graphicsToDelete)
                });
            }

            if (!conservative) {
                consola.info('Updating the project preamble.');
                await AppDataSource.getRepository(AuxData).upsert({
                    key: 'preamble',
                    value: r.preamble,
                }, ['key']);
            }

            consola.success(`Successfully updated the database.`);
        });

        // Output counts for the summary.
        metrics.set('unitsUpdated',   result.unitsToUpdate.length);
        metrics.set('unitsDeleted',   result.unitsToDelete.length);
        metrics.set('graphicsCopied', result.graphicsToUpdate.length);
        // graphicsSkipped is set by Compiler.copyGraphics on the same metrics instance.
    } catch (error) {
        dbFailed = true;
        consola.error('Failed to update the database.');
        console.error(error);
    } finally {
        metrics.finish();
        try {
            consola.box(metrics.format({
                errors:   parser.logger.errors,
                warnings: parser.logger.warnings,
            }));
        } catch (e) {
            // If the box renderer fails for any reason, fall back to plain log.
            consola.log(metrics.format({
                errors:   parser.logger.errors,
                warnings: parser.logger.warnings,
            }));
        }
    }

    if (dbFailed) {
        process.exit(42);
    }
}

//runCompiler({compileAll: true}).catch(console.error);


