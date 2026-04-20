import { MachoFile } from '../src/macho';
import { NodeReader } from '../src/readers/node-reader';
import { describe, it, expect } from 'vitest';

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