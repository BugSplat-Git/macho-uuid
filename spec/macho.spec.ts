import { MachoFile } from '../src/macho';

// TODO BG dwarfdump will get the UUID if you point it at the bundle, can we support this too?
describe('MachoFile', () => {
    describe('getHeader', () => {
        it('should throw if signature isn\'t valid', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            return expectAsync(macho.getHeader()).toBeRejectedWithError(/Could not parse Mach-O header/);
        });

        it('should return Mach-O header', async () => {
            const macho = new MachoFile('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
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
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            (macho as any).header = { ncmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain commands/);
        });

        it('should throw if header doesn\'t contain command section size', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            (macho as any).header = { ncmds: 1, sizeofcmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain command section size/)
        });

        it('should throw if commands can\'t be read', async () => {
            const macho = new MachoFile('spec/support/corrupt.app/Contents/Resources/DWARF/corrupt');
            (macho as any).header = { ncmds: 1, sizeofcmds: 1, hsize: 32 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Could not read Mach-O commands./)
        });

        it('should return UUID for dsym', async () => {
            const file = new MachoFile('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
            const uuid = await file.getUUID();

            expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        });

        it('should return UUID for app', async () => {
            const file = new MachoFile('spec/support/bugsplat-ios.app/bugsplat-ios');
            const uuid = await file.getUUID();

            expect(uuid).toEqual('59686d50e0a43fb9ad27baadad47e0bc');
        });
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