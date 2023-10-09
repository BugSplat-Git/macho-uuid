import { MachoFile } from '../src/macho';

describe('MachoFile', () => {
    describe('getHeader', () => {
        it('should throw if signature isn\'t valid', async () => {
            const macho = await MachoFile.createFromFile('spec/support/corrupt.app');
            return expectAsync(macho.getHeader()).toBeRejectedWithError(/Could not parse Mach-O header/)
        });

        it('should return Mach-O header', async () => {
            const macho = await MachoFile.createFromFile('spec/support/bugsplat.app.dSYM');
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
            const macho = await MachoFile.createFromFile('spec/support/corrupt.app');
            (macho as any).header = { ncmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain commands/);
        });

        it('should throw if header doesn\'t contain command section size', async () => {
            const macho = await MachoFile.createFromFile('spec/support/corrupt.app');
            (macho as any).header = { ncmds: 1, sizeofcmds: 0 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Mach-O header doesn't contain command section size/)
        });

        it('should throw if commands can\'t be read', async () => {
            const macho = await MachoFile.createFromFile('spec/support/corrupt.app');
            (macho as any).header = { ncmds: 1, sizeofcmds: 1, hsize: 32 };
            return expectAsync(macho.getUUID()).toBeRejectedWithError(/Could not read Mach-O commands./)
        });

        it('should return UUID', async () => {
            const file = await MachoFile.createFromFile('spec/support/bugsplat.app.dSYM');
            const uuid = await file.getUUID();

            expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        });
    });

    describe('createFromFile', () => {

        it('should throw error if path is missing', async () =>
            expectAsync(MachoFile.createFromFile('')).toBeRejectedWithError(/Missing path/)
        );

        it('should throw error if file is not a .app, .dSYM, or executable binary', async () =>
            expectAsync(MachoFile.createFromFile('index.ts')).toBeRejectedWithError(/not a .app, .dSYM, or executable binary/)
        );

        it('should throw error if file does not exist', async () =>
            expectAsync(MachoFile.createFromFile('does-not-exist')).toBeRejectedWithError(/File does not exist/)
        );

        it('should return MachoFile', async () => {
            const file = await MachoFile.createFromFile('spec/support/bugsplat.app.dSYM');
            expect(file).toBeTruthy();
        });
    })
});