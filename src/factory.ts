import { existsSync, lstatSync } from 'fs';
import { stat } from 'node:fs/promises';
import { extname } from 'path';
import { FatFile } from './fat';
import { MachoFile } from './macho';
import filterAsync from 'node-filter-async';
import {glob} from 'glob';

const extensions = [
    '.app',
    '.dsym',
    '.bundle',
    '.framework',
    '.xcarchive',
    ''
];

export async function createMachoFiles(path: string): Promise<MachoFile[]> {
    if (!path) {
        throw new Error('Missing path to Mach-O file or Universal binary.');
    }

    if (!existsSync(path)) {
        throw new Error(`File does not exist at ${path}`);
    }

    const extension = extname(path).toLowerCase();

    if (!extensions.includes(extension)) {
        throw new Error(`Invalid file extension at ${path}`);
    }

    let symbolFiles = [path];
    if (lstatSync(path).isDirectory()) {
        const normalizedPath = path.replaceAll('\\', '/');
        const files = await glob(`${normalizedPath}/**/*`, { nodir: true });
        const filteredFiles = await filterAsync(files, isFatOrMacho);
        symbolFiles = filteredFiles;
    }

    const machoFiles = await Promise.all(
        symbolFiles.map(
            async (file) => {
                const fat = await FatFile.isFat(file);

                if (fat) {
                    return new FatFile(file).getMachos();
                }

                return new MachoFile(file);
            }
        )
    ).then((files) => files.flat());

    const uniqueMachoFiles = new Map<string, MachoFile>();

    for (const file of machoFiles) {
        const uuid = await file.getUUID();
        const exists = uniqueMachoFiles.has(uuid);

        if (!exists) {
            uniqueMachoFiles.set(uuid, file);
            continue;
        }

        const existing = uniqueMachoFiles.get(uuid)!;
        const existingSize = await stat(existing.path).then(stats => stats.size);
        const currentSize = await stat(file.path).then(stats => stats.size);
        const newValue = existingSize > currentSize ? existing : file;
        uniqueMachoFiles.set(uuid, newValue);
    }

    return Array.from(uniqueMachoFiles.values());
}

async function isFatOrMacho(path: string): Promise<boolean> {
    return !extname(path) && (await MachoFile.isMacho(path) || await FatFile.isFat(path));
}