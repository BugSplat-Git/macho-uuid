import { unlink } from 'node:fs/promises';
import { MachoFile } from '../src/macho';
import { createMachoFiles } from '../src/factory';
import { NodeReader } from '../src/readers/node-reader';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// TODO BG dwarfdump will get the UUID if you point it at the bundle, can we support this too?
describe('MachoFile', () => {
    describe('getHeader', () => {
        it('should throw if signature isn\'t valid', async () => {
            const reader = new NodeReader('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            const macho = new MachoFile(reader, 0, 0);
            return expect(macho.getHeader()).rejects.toThrow(/Could not parse Mach-O header/);
        });

        it('should return Mach-O header', async () => {
            const reader = new NodeReader('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
            const macho = new MachoFile(reader, 0, 0);
            const header = await macho.getHeader();

            expect(header).toEqual(expect.objectContaining({
                hsize: 32,
                ncmds: 7,
                sizeofcmds: 3048
            }));
        });
    });

    describe('getUUID', () => {
        it('should throw if header doesn\'t contain commands', async () => {
            const reader = new NodeReader('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            const macho = new MachoFile(reader, 0, 0);
            (macho as any).header = { ncmds: 0 };
            return expect(macho.getUUID()).rejects.toThrow(/Mach-O header doesn't contain commands/);
        });

        it('should throw if header doesn\'t contain command section size', async () => {
            const reader = new NodeReader('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            const macho = new MachoFile(reader, 0, 0);
            (macho as any).header = { ncmds: 1, sizeofcmds: 0 };
            return expect(macho.getUUID()).rejects.toThrow(/Mach-O header doesn't contain command section size/)
        });

        it('should throw if commands can\'t be read', async () => {
            const reader = new NodeReader('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            const macho = new MachoFile(reader, 0, 0);
            (macho as any).header = { ncmds: 1, sizeofcmds: 1, hsize: 32 };
            return expect(macho.getUUID()).rejects.toThrow(/Could not read Mach-O commands./)
        });

        it('should return UUID for dsym', async () => {
            const reader = new NodeReader('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
            const file = new MachoFile(reader, 0, 0);
            const uuid = await file.getUUID();

            expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        });

        it('should return UUID for app', async () => {
            const reader = new NodeReader('spec/support/bugsplat-ios.app/bugsplat-ios');
            const file = new MachoFile(reader, 0, 0);
            const uuid = await file.getUUID();

            expect(uuid).toEqual('59686d50e0a43fb9ad27baadad47e0bc');
        });
    });

    describe('writeFile', () => {
        let files: Array<MachoFile> = [];
        let tmpFiles: Array<string> = [];
    
        beforeEach(async () => {
          files = await createMachoFiles(
            'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'
          );
          tmpFiles = await Promise.all(
            files.map(async (file) => `${file.path}-${await file.getUUID()}.tmp`)
          );
          await unlinkFiles(tmpFiles);
        });
    
        it('should extract machos from fat file', async () => {
          const expectedDbgIds = await Promise.all(
            files.map((file) => file.getUUID())
          );
          await Promise.all(
            files.map((file, index) => file.writeFile(tmpFiles[index]))
          );
          const machos = tmpFiles.map((file) => new MachoFile(new NodeReader(file), 0, 0, file));
          const dbgIds = await Promise.all(machos.map((file) => file.getUUID()));
          expect(dbgIds).toEqual(expectedDbgIds);
        });
    
        afterEach(async () => unlinkFiles(tmpFiles));
    });
    
    describe('isMacho', () => {
        it('should return false for fat file', async () => {
            const reader = new NodeReader('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources');
            await expect(MachoFile.isMacho(reader)).resolves.toBe(false)
        });

        it('should return true for macho file', async () => {
            const reader = new NodeReader('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
            await expect(MachoFile.isMacho(reader)).resolves.toBe(true)
        });
    });
});
    
async function unlinkFiles(paths: Array<string>) {
    return Promise.all(paths.map((path) => unlink(path).catch(() => {})));
}