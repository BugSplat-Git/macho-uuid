import { Parser, constants } from "macho";
import { Reader } from "./reader";

const maxSizeOfMachoHeader = 32;

export class MachoFile {
  private cpuType: string | undefined;
  private uuid: string | undefined;
  private header: MachoHeader | undefined;

  constructor(
    public readonly reader: Reader,
    public readonly headerOffset: number,
    public readonly size: number,
    public readonly path?: string
  ) {}

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
    return uuid
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5")
      .toUpperCase();
  }

  async isValid(): Promise<boolean> {
    let isValid = false;

    try {
      isValid = await this.getUUID().then((uuid) => !!uuid);
    } catch {
      isValid = false;
    }

    return isValid;
  }

  static async isMacho(reader: Reader): Promise<boolean> {
    let isMacho = false;
    try {
      const buffer = await reader.read(0, maxSizeOfMachoHeader);

      if (buffer.length > 0) {
        try {
          const header = (new Parser() as Parser).parseHead(buffer);
          isMacho = !!header;
        } catch {
          // parseHead can throw if buffer is not a valid macho header
          isMacho = false;
        }
      }
    } catch {
      isMacho = false;
    }

    return isMacho;
  }

  private readCpuType(): Promise<string> {
    return this.getHeader().then(({ cpu }) => cpu.type || "?");
  }

  private async readHeader(): Promise<MachoHeader> {
    let header: MachoHeader | false;

    const buffer = await this.reader.read(
      this.headerOffset,
      maxSizeOfMachoHeader
    );

    if (buffer.length === 0) {
      throw new Error("Could not read Mach-O header.");
    }

    try {
      header = (new Parser() as Parser).parseHead(buffer);
    } catch (e) {
      throw new Error("Could not parse Mach-O header.");
    }

    if (!header) {
      throw new Error("Could not parse Mach-O header.");
    }

    return header;
  }

  private async readUUID(): Promise<string> {
    const { ncmds, sizeofcmds, hsize } = await this.getHeader();

    let uuid = "";

    if (!ncmds) {
      throw new Error("Mach-O header doesn't contain commands.");
    }

    if (!sizeofcmds) {
      throw new Error("Mach-O header doesn't contain command section size.");
    }

    const buffer = await this.reader.read(
      this.headerOffset + hsize,
      sizeofcmds
    );

    if (buffer.length === 0) {
      throw new Error("Could not read Mach-O commands.");
    }

    let offset = 0;
    while (!uuid) {
      if (offset + 4 > buffer.length) break;
      const cmd = buffer.readUInt32LE(offset);
      const cmdsize = buffer.readUInt32LE(offset + 4);

      if (constants.cmdType[cmd] === "uuid") {
        uuid = buffer.subarray(offset + 8, offset + 24).toString("hex");
      }

      offset += cmdsize;
    }

    return uuid;
  }
}

type Parser = {
  parseHead(buffer: Buffer): MachoHeader | false;
};

type MachoHeader = {
  bits: 32 | 64;
  body: Buffer;
  cmds: Array<unknown>;
  cpu: { type: string; subtype: string; endian: "le" | "be" };
  filetype: "dsym" | unknown;
  flags: Record<string, unknown>;
  hsize: 28 | 32;
  magic: 0xfeedface | 0xcefaedfe | 0xfeedfacf | 0xcffaedfe;
  ncmds: number;
  sizeofcmds: number;
};
