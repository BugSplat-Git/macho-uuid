#! /usr/bin/env node
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { MachoFile } from '../src/macho';
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
        const file = await MachoFile.createFromPath(path);
        const uuid = await file[0].getUUID(); // TODO BG
        console.log(uuid);
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
