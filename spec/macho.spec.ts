import { MachoFile } from '../src/macho';

describe('MachoFile', () => {
    describe('getHeader', () => {
        it('should throw if signature isn\'t valid', async () => {
            const macho = await MachoFile.createFromPath('spec/support/corrupt.app').then(files => files[0]);
            return expectAsync(macho.getHeader()).toBeRejectedWithError(/Could not parse Mach-O header/)
        });

        it('should return Mach-O header', async () => {
            const macho = await MachoFile.createFromPath('spec/support/bugsplat.app.dSYM').then(files => files[0]);
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
            const macho = await MachoFile.createFromPath('spec/support/corrupt.app').then(files => files[0]);
            (macho as any).header = { ncmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain commands/);
        });

        it('should throw if header doesn\'t contain command section size', async () => {
            const macho = await MachoFile.createFromPath('spec/support/corrupt.app').then(files => files[0]);
            (macho as any).header = { ncmds: 1, sizeofcmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain command section size/)
        });

        it('should throw if commands can\'t be read', async () => {
            const macho = await MachoFile.createFromPath('spec/support/corrupt.app').then(files => files[0]);
            (macho as any).header = { ncmds: 1, sizeofcmds: 1, hsize: 32 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Could not read Mach-O commands./)
        });

        it('should return UUID for dsym', async () => {
            const file = await MachoFile.createFromPath('spec/support/bugsplat.app.dSYM').then(files => files[0]);
            const uuid = await file.getUUID();

            expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        });

        it('should return UUID for app', async () => {
            const file = await MachoFile.createFromPath('spec/support/bugsplat-ios.app').then(files => files[0]);
            const uuid = await file.getUUID();

            expect(uuid).toEqual('59686d50e0a43fb9ad27baadad47e0bc');
        });
    });

    describe('isMacho', () => {
        it('todo bg', () => {
            throw new Error('todo bg');
        });
    });

    describe('isFat', () => {
        it('should return false if file is not a fat binary', async () => {
            return expectAsync(MachoFile.isFat('spec/support/bugsplat.app.dSYM')).toBeResolvedTo(false);
        });
    
        it('should return true if file is a fat binary', async () => {
            return expectAsync(MachoFile.isFat('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources')).toBeResolvedTo(true);
        });
    });

    describe('createFromPath', () => {

        it('should throw error if path is missing', async () =>
            expectAsync(MachoFile.createFromPath('')).toBeRejectedWithError(/Missing path/)
        );

        it('should throw error if file is not a .app, .dSYM, or executable binary', async () =>
            expectAsync(MachoFile.createFromPath('index.ts')).toBeRejectedWithError(/Invalid file extension/)
        );

        it('should throw error if file does not exist', async () =>
            expectAsync(MachoFile.createFromPath('does-not-exist')).toBeRejectedWithError(/File does not exist/)
        );

        it('should return MachoFile for dsym', async () => {
            const files = await MachoFile.createFromPath('spec/support/bugsplat.app.dSYM');
            expect(files.length).toEqual(1);
        });

        it('should return macho files for app', async () => {
            const files = await MachoFile.createFromPath('spec/support/bugsplat-ios.app');
            expect(files.length).toEqual(1);
        });
    });
    
    describe('createFromFat', () => {
        it('todo bg', () => {
            throw new Error('todo bg');
        });
    });
});