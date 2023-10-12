#! /usr/bin/env node
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { createMachoFiles } from '../src/factory';
import { argDefinitions, usageDefinitions } from './command-line-definitions';

(async () => {
    let {
        path,
        help,
    } = commandLineArgs(argDefinitions);

    if (help) {
        logHelpAndExit();    
    }

    try {       
        const files = await createMachoFiles(path);
        const info = await Promise.all(files.map(async (file) => ({ path: file.path, uuid: await file.getUUID()})));
        console.log(info);
    } catch (error) {
        console.log((error as Error).message);
        process.exit(1);
    }
})();

function logHelpAndExit() {
    const help = commandLineUsage(usageDefinitions);
    console.log(help);
    process.exit(1);
}
