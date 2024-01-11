import { Parser, constants } from 'macho';
import { createReadStream, createWriteStream } from 'node:fs';
import { FileHandle, open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

const maxSizeOfMachoHeader = 32;

export class MachoFile {
    private cpuType: string | undefined;
    private uuid: string | undefined;
    private header: MachoHeader | undefined;

    constructor(public readonly path: string, private headerOffset: number, private size: number) { }

    async getCpuType(): Promise<string> {
        if (!this.cpuType) {
            this.cpuType = await this.readCpuType();
        }

        return this.cpuType;
    }

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

    async getUUIDFormatted(): Promise<string> {
        const uuid = await this.getUUID();
        return uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5').toUpperCase();
    }

    async isValid(): Promise<boolean> {
        let isValid = false;
        
        try {
            isValid = await this.getUUID().then(uuid => !!uuid);
        } catch {
            isValid = false;
        }

        return isValid;
    }
    
    async writeFile(outputPath: string): Promise<void> {
      const writeStream = createWriteStream(outputPath);
      const readStream = createReadStream(this.path, {
        start: this.headerOffset,
        end: this.headerOffset + this.size,
      });
  
      await pipeline(readStream, writeStream);
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

    private readCpuType(): Promise<string> {
        return this.getHeader().then(({ cpu }) => cpu.type || '?');
    }

    private async readHeader(): Promise<MachoHeader> {
        let header: MachoHeader | false;
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(this.path, 'r');

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(maxSizeOfMachoHeader), 0, maxSizeOfMachoHeader, this.headerOffset);

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

            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(sizeofcmds), 0, sizeofcmds, this.headerOffset + hsize);

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
    cpu: { type: string; subtype: string; endian: 'le' | 'be' };
    filetype: 'dsym' | unknown;
    flags: Record<string, unknown>;
    hsize: 28 | 32;
    magic: 0xfeedface | 0xcefaedfe | 0xfeedfacf | 0xcffaedfe;
    ncmds: number;
    sizeofcmds: number;
}