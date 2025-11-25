import { Reader } from '../reader';
import { open } from 'node:fs/promises';
import { statSync } from 'node:fs';

export class NodeReader implements Reader {
    constructor(public readonly path: string) {}

    async read(offset: number, length: number): Promise<Buffer> {
        const fileHandle = await open(this.path, 'r');
        try {
            const buf = Buffer.alloc(length);
            const { bytesRead } = await fileHandle.read(buf as unknown as NodeJS.ArrayBufferView, 0, length, offset);
            return buf.subarray(0, bytesRead);
        } finally {
            await fileHandle.close();
        }
    }

    size(): number {
        return statSync(this.path).size;
    }
}

