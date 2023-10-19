#! /usr/bin/env node
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { createMachoFiles } from '../src/factory';
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
        const files = await createMachoFiles(path);
        const infos = await Promise.all(files.map(createMachoFileInfo));
        const info = infos.join('\n');
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

async function createMachoFileInfo(file: MachoFile): Promise<string> {
    const uuid = await file.getUUIDFormatted();
    const cpu = await file.getCpuType();
    const path = file.path;
    return `UUID: ${uuid} (${cpu}) ${path}`;
}
