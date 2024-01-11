import { unlink } from 'node:fs/promises';
import { MachoFile } from '../src/macho';
import { createMachoFiles } from '../src/factory';

// TODO BG dwarfdump will get the UUID if you point it at the bundle, can we support this too?
describe('MachoFile', () => {
    describe('getHeader', () => {
        it('should throw if signature isn\'t valid', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt', 0, 0);
            return expectAsync(macho.getHeader()).toBeRejectedWithError(/Could not parse Mach-O header/);
        });

        it('should return Mach-O header', async () => {
            const macho = new MachoFile('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat', 0, 0);
            const header = await macho.getHeader();

            expect(header).toEqual(jasmine.objectContaining({
                hsize: 32,
                ncmds: 7,
                sizeofcmds: 3048
            }));
        });
    });

    describe('getUUID', () => {
        it('should throw if header doesn\'t contain commands', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt', 0, 0);
            (macho as any).header = { ncmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain commands/);
        });

        it('should throw if header doesn\'t contain command section size', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt', 0, 0);
            (macho as any).header = { ncmds: 1, sizeofcmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain command section size/)
        });

        it('should throw if commands can\'t be read', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt', 0, 0);
            (macho as any).header = { ncmds: 1, sizeofcmds: 1, hsize: 32 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Could not read Mach-O commands./)
        });

        it('should return UUID for dsym', async () => {
            const file = new MachoFile('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat', 0, 0);
            const uuid = await file.getUUID();

            expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        });

        it('should return UUID for app', async () => {
            const file = new MachoFile('spec/support/bugsplat-ios.app/bugsplat-ios', 0, 0);
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
          const machos = tmpFiles.map((file) => new MachoFile(file, 0, 0));
          const dbgIds = await Promise.all(machos.map((file) => file.getUUID()));
          expect(dbgIds).toEqual(expectedDbgIds);
        });
    
        afterEach(async () => unlinkFiles(tmpFiles));
    });
    
    describe('isMacho', () => {
        it('should return false for fat file', async () => 
            expectAsync(MachoFile.isMacho('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources')).toBeResolvedTo(false)
        );

        it('should return true for macho file', async () =>
            expectAsync(MachoFile.isMacho('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat')).toBeResolvedTo(true)
        );
    });
});
    
async function unlinkFiles(paths: Array<string>) {
    return Promise.all(paths.map((path) => unlink(path).catch(() => {})));
}