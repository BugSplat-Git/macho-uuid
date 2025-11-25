import { Reader } from './reader';
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

    constructor(public readonly reader: Reader, public readonly path?: string) { }

    static async isFat(reader: Reader): Promise<boolean> {
        let isFat = false;
        try {
            const buffer = await reader.read(0, sizeOfFatMagic);

            if (buffer.length === sizeOfFatMagic) {
                const expected = Buffer.from(fatMagic);
                isFat = Buffer.compare(buffer, expected) === 0;
            }
        } catch {
            isFat = false;
        }

        return isFat;
    }

    private async readMachos(): Promise<Array<MachoFile>> {
        let machos: Array<MachoFile> = [];
        
        const numberOfMachosSectionStartOffset = 4;
        const sizeOfNumberOfMachosSection = 4;
        const buffer = await this.reader.read(numberOfMachosSectionStartOffset, sizeOfNumberOfMachosSection);

        if (buffer.length !== sizeOfNumberOfMachosSection) {
            throw new Error('Could not read Fat header.');
        }

        const numberOfMachos = buffer.readUInt32BE(0);

        for (let i = 0; i < numberOfMachos; i++) {
            const numberOfBytesToRead = lengthOfMachoStartOffset + lengthOfMachoSize;
            const machoStartOffset = sizeOfFatMagic + sizeOfNumberOfMachosSection + (i * lengthOfFatArchSection);
            const machoFileOffsetOffset = machoStartOffset + lengthOfCpuType + lengthOfCpuSubType;
            const buffer = await this.reader.read(machoFileOffsetOffset, numberOfBytesToRead);

            if (buffer.length !== numberOfBytesToRead) {
                throw new Error('Could not read Fat header.');
            }

            const machoFileOffset = buffer.readUInt32BE(0);
            const machoFileSize = buffer.readUInt32BE(lengthOfMachoStartOffset);
            const machoFile = new MachoFile(this.reader, machoFileOffset, machoFileSize, this.path);
            const valid = await machoFile.isValid();

            if (valid) {
                machos.push(machoFile);
            }
        }

        return machos;
    }
}
