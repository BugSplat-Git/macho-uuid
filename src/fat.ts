import { FileHandle, open } from 'node:fs/promises';
import { MachoFile } from './macho';

const fatMagic = [0xca, 0xfe, 0xba, 0xbe];
const sizeOfFatMagic = fatMagic.length
const lengthOfCpuType = 4;
const lengthOfCpuSubType = 4;
const lengthOfMachoStartOffset = 4;
const lengthOfMachoSize = 4;
const lengthOfAlign = 4;
const lengthOfFatArchSection = lengthOfCpuType + lengthOfCpuSubType + lengthOfMachoStartOffset + lengthOfMachoSize + lengthOfAlign;

export class FatFile {
    private machoFiles: Array<MachoFile> = [];

    async getMachos(): Promise<MachoFile[]> {
        if (!this.machoFiles.length) {
            this.machoFiles = await this.readMachos();
        }

        return this.machoFiles;
    }

    constructor(public readonly path: string) { }

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

    private async readMachos(): Promise<Array<MachoFile>> {
        let machos: Array<MachoFile> = [];
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(this.path, 'r');

            const numberOfMachosSectionStartOffset = 4;
            const sizeOfNumberOfMachosSection = 4;
            const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(sizeOfNumberOfMachosSection), 0, sizeOfNumberOfMachosSection, numberOfMachosSectionStartOffset);

            if (bytesRead !== sizeOfNumberOfMachosSection) {
                throw new Error('Could not read Fat header.');
            }

            const numberOfMachos = buffer.readUInt32BE(0);

            for (let i = 0; i < numberOfMachos; i++) {
                const machoStartOffset = sizeOfFatMagic + sizeOfNumberOfMachosSection + (i * lengthOfFatArchSection);
                const machoFileOffsetOffset = machoStartOffset + lengthOfCpuType + lengthOfCpuSubType;
                const { buffer, bytesRead } = await fileHandle.read(Buffer.alloc(lengthOfMachoStartOffset), 0, lengthOfMachoStartOffset, machoFileOffsetOffset);

                if (bytesRead !== lengthOfMachoStartOffset) {
                    throw new Error('Could not read Fat header.');
                }

                const machoFileOffset = buffer.readUInt32BE(0); 
                const machoFileSize = buffer.readUInt32BE(0);
                const machoFile = new MachoFile(this.path, machoFileOffset, machoFileSize);
                const valid = await machoFile.isValid();

                if (valid) {
                    machos.push(machoFile);
                }
            }
        } finally {
            await fileHandle!?.close();
        }

        return machos;
    }
}