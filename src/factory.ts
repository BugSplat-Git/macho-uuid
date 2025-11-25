import { existsSync, lstatSync } from 'fs';
import { stat } from 'node:fs/promises';
import { extname } from 'path';
import { FatFile } from './fat';
import { MachoFile } from './macho';
import filterAsync from 'node-filter-async';
import {glob} from 'glob';
import { NodeReader } from './readers/node-reader';

const extensions = [
    '.app',
    '.dsym',
    '.bundle',
    '.framework',
    '.xcarchive',
    '.dylib',
    ''
];

// Many of the accepted extension types specified above are actually directories.
// Create an array of Mach-O files containing symbol information by recursively reading a given path.
// When encountering a FAT Universal binary file, read the header and create multiple Mach-O files accordingly.
export async function createMachoFiles(path: string): Promise<MachoFile[]> {
    if (!path) {
        throw new Error('Missing path to Mach-O file or Universal binary.');
    }

    if (!existsSync(path)) {
        throw new Error(`File does not exist at ${path}`);
    }

    if (!extensions.includes(extname(path).toLowerCase())) {
        throw new Error(`Invalid file extension at ${path}`);
    }

    const symbolFiles = lstatSync(path).isDirectory() ? await findSymbolFilesRecursively(path) : [path];
    const machoFiles = await createMachoFilesFromSymbolFiles(symbolFiles);
    const uniqueMachoFiles = await getUniqueMachoFiles(machoFiles);

    return uniqueMachoFiles;
}

async function createMachoFilesFromSymbolFiles(symbolFilePaths: Array<string>): Promise<Array<MachoFile>> {
    return Promise.all(
        symbolFilePaths.map(
            async (file) => {
                const reader = new NodeReader(file);
                const fat = await FatFile.isFat(reader);

                if (fat) {
                    return new FatFile(reader, file).getMachos();
                }

                const { size } = await stat(file);
                return new MachoFile(reader, 0, size, file);
            }
        )
    ).then((files) => files.flat());
}

async function findSymbolFilesRecursively(path: string): Promise<Array<string>> {
    const normalizedPath = path.replaceAll('\\', '/');
    const files = await glob(`${normalizedPath}/**/*`, { nodir: true });
    return filterAsync(files, isFatOrMacho);
}

// Executable binaries and the corresponding symbol files can have the same UUID.
// We want the file containing the most symbol information, this is likely the dSYM.
// If for some reason one of the files is not a dSYM, we take whichever is larger.
async function getUniqueMachoFiles(machoFiles: Array<MachoFile>): Promise<Array<MachoFile>> {
    const uniqueMachoFiles = new Map<string, MachoFile>();
    
    for (const file of machoFiles) {
        const uuid = await file.getUUID();
        const exists = uniqueMachoFiles.has(uuid);

        const filePath = file.path || '';

        if (!exists || filePath.toLowerCase().includes('.dsym')) {
            uniqueMachoFiles.set(uuid, file);
            continue;
        }

        const existing = uniqueMachoFiles.get(uuid)!;
        const existingPath = existing.path || '';
        
        if (existingPath.toLowerCase().includes('.dsym')) {
            continue;
        }

        const existingSize = existing.reader.size();
        const currentSize = file.reader.size();
        const newValue = existingSize > currentSize ? existing : file;
        
        uniqueMachoFiles.set(uuid, newValue);
    }

    return Array.from(uniqueMachoFiles.values());
}

export async function isFatOrMacho(path: string): Promise<boolean> {
    const reader = new NodeReader(path);
    return (await MachoFile.isMacho(reader) || await FatFile.isFat(reader));
}
