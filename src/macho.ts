import { Parser, constants } from "macho";
import { existsSync } from "node:fs";
import { FileHandle, open, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const maxSizeOfMachoHeader = 32;

export class MachoFile {
    private uuid: string | undefined;
    private header: MachoHeader | undefined;
    
    constructor(private path: string) { }

    async getHeader(): Promise<MachoHeader> {
        if (!this.header) {
            this.header = await this.readHeader();
        }
        
        return this.header;
    }

    async getUUID(): Promise<string> {
        if (!this.uuid) {
            this.uuid = await this.readUUID();
        }

        return this.uuid;
    }

    static async createFromFile(path: string): Promise<MachoFile> {
        if (!path) {
            throw new Error('Missing path to .app, .dSYM, or executable binary file.');
        }

        if (!existsSync(path)) {
            throw new Error(`File does not exist at ${path}`);
        }
    
        const extension = extname(path).toLowerCase();
            
        if (extension !== '.app' && extension !== '.dsym' && extension !== '') {
            throw new Error('File in not a .app, .dSYM, or executable binary: ' + path);
        }
    
        const resources = join(path, 'Contents', 'Resources', 'DWARF');
        const files = await readdir(resources);
    
        if (files.length > 1) {
            // TODO BG should we throw here?
            throw new Error(`Multiple resources detected at path ${resources}`);
        }
    
        const symbolFile = join(resources, files[0]);
    
        return new MachoFile(symbolFile);
    }

    private async readHeader(): Promise<MachoHeader> {
        let header: MachoHeader | false;
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(this.path, 'r');

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(maxSizeOfMachoHeader), 0, maxSizeOfMachoHeader, 0);

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

    private async readUUID(): Promise<string> {
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

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(sizeofcmds), 0, sizeofcmds, hsize);

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