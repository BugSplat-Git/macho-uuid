import { Reader } from '../reader';

export class WebReader implements Reader {
    constructor(public readonly blob: Blob) {}

    async read(offset: number, length: number): Promise<Buffer> {
        const slice = this.blob.slice(offset, offset + length);
        const arrayBuffer = await slice.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    size(): number {
        return this.blob.size;
    }
}


