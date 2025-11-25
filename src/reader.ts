export interface Reader {
    read(offset: number, length: number): Promise<Buffer>;
    size(): number;
}


