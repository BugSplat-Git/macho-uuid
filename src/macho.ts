import { glob } from 'glob';
import { Parser, constants } from 'macho';
import filterAsync from 'node-filter-async';
import { existsSync, lstatSync } from 'node:fs';
import { FileHandle, open } from 'node:fs/promises';
import { extname } from 'node:path';

const fatMagic = [0xca, 0xfe, 0xba, 0xbe];
const sizeOfFatMagic = fatMagic.length
const maxSizeOfMachoHeader = 32;
const extensions = [
    '.app',
    '.dsym',
    '.bundle',
    '.framework',
    '.xcarchive',
    ''
];

export class MachoFile {
    private uuid: string | undefined;
    private header: MachoHeader | undefined;

    constructor(private path: string) { }

    async getHeader(headerOffset = 0): Promise<MachoHeader> {
        if (!this.header) {
            this.header = await this.readHeader(headerOffset);
        }

        return this.header;
    }

    async getUUID(headerOffset = 0): Promise<string> {
        if (!this.uuid) {
            this.uuid = await this.readUUID(headerOffset);
        }

        return this.uuid;
    }

    static async createFromPath(path: string): Promise<Array<MachoFile>> {
        if (!path) {
            throw new Error('Missing path to .app, .dSYM, or executable binary file.');
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
            const isFatOrMacho = async (path) => !extname(path) && await MachoFile.isFatOrMacho(path);
            const filteredFiles = await filterAsync(files, isFatOrMacho);
            symbolFiles = filteredFiles;
        }

        return Promise.all(
            symbolFiles.map(
                async (file) => {
                    const fat = await MachoFile.isFat(file);

                    if (fat) {
                        return MachoFile.createFromFat(file);
                    }

                    return new MachoFile(file);
                }
            )
        ).then((files) => files.flat());
    }

    static async isFat(path: string): Promise<boolean> {
        let isFat = false;
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(path, 'r');

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(sizeOfFatMagic), 0, sizeOfFatMagic, 0);

            if (bytesRead === sizeOfFatMagic) {
                const expected = Buffer.from(fatMagic);
                isFat = Buffer.compare(buffer, expected) === 0;
            }
        } catch {
            isFat = false;
        } finally {
            await fileHandle!?.close();
        }

        return isFat;
    }

    static async isMacho(path: string): Promise<boolean> {
        let isMacho = false;
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(path, 'r');

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(maxSizeOfMachoHeader), 0, maxSizeOfMachoHeader, 0);

            if (bytesRead) {
                const header = (new Parser() as Parser).parseHead(buffer);
                isMacho = !!header;
            }
        } catch {
            isMacho = false;
        } finally {
            await fileHandle!?.close();
        }

        return isMacho;
    }

    static async createFromFat(path: string): Promise<Array<MachoFile>> {

        throw new Error('todo bg');
    }

    private static async isFatOrMacho(path: string): Promise<boolean> {
       return (await MachoFile.isMacho(path) || await MachoFile.isFat(path));
    }

    private async readHeader(headerOffset = 0): Promise<MachoHeader> {
        let header: MachoHeader | false;
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(this.path, 'r');

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(maxSizeOfMachoHeader), 0, maxSizeOfMachoHeader, headerOffset);

            if (!bytesRead) {
                throw new Error('Could not read Mach-O header.');
            }

            header = (new Parser() as Parser).parseHead(buffer);

            if (!header) {
                throw new Error('Could not parse Mach-O header.');
            }

        } finally {
            await fileHandle!?.close();
        }

        return header;
    }

    private async readUUID(headerOffset): Promise<string> {
        const { ncmds, sizeofcmds, hsize } = await this.getHeader();

        let uuid = '';
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(this.path, 'r');

            if (!ncmds) {
                throw new Error('Mach-O header doesn\'t contain commands.');
            }

            if (!sizeofcmds) {
                throw new Error('Mach-O header doesn\'t contain command section size.');
            }

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(sizeofcmds), 0, sizeofcmds, headerOffset + hsize);

            if (!bytesRead) {
                throw new Error('Could not read Mach-O commands.');
            }

            let offset = 0;
            while (!uuid) {
                const cmd = buffer.readUInt32LE(offset);
                const cmdsize = buffer.readUInt32LE(offset + 4);

                if (constants.cmdType[cmd] === 'uuid') {
                    uuid = buffer.subarray(offset + 8, offset + 24).toString('hex');
                }

                offset += cmdsize;
            }
        } finally {
            await fileHandle!?.close();
        }

        return uuid;
    }
}

type Parser = {
    parseHead(buffer: Buffer): MachoHeader | false;
}

type MachoHeader = {
    bits: 32 | 64;
    body: Buffer;
    cmds: Array<unknown>;
    cpu: unknown;
    filetype: 'dsym' | unknown;
    flags: Record<string, unknown>;
    hsize: 28 | 32;
    magic: 0xfeedface | 0xcefaedfe | 0xfeedfacf | 0xcffaedfe;
    ncmds: number;
    sizeofcmds: number;
}