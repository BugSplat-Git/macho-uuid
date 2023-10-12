import { createMachoFiles } from '../src/factory';

describe('createMachoFiles', () => {
    it('should throw error if path is missing', async () =>
        expectAsync(createMachoFiles('')).toBeRejectedWithError(/Missing path/)
    );

    it('should throw error if file is not a .app, .dSYM, .framework, .bundle, .xcarchive, or executable binary', async () =>
        expectAsync(createMachoFiles('index.ts')).toBeRejectedWithError(/Invalid file extension/)
    );

    it('should throw error if file does not exist', async () =>
        expectAsync(createMachoFiles('does-not-exist')).toBeRejectedWithError(/File does not exist/)
    );

    it('should return MachoFiles for an app containing a Universal Binary', async () => {
        const expected = new Map([
            ['59686d50e0a43fb9ad27baadad47e0bc', 'spec/support/bugsplat-ios.app/bugsplat-ios'],
            ['c3e6032cb73e39d59d872acc2a515240', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/bugsplat'],
            ['39d9cb72de663ca6b85bbfa04b60782e', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
            ['7f2b35c3974533d1b991ec0da93cc085', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources']
        ]);
        const files = await createMachoFiles('spec/support/bugsplat-ios.app');

        for (const file of files) {
            const uuid = await file.getUUID();
            const path = file.path;
            expect(expected.get(uuid)).toEqual(path);
        }
    });

    it('should return MachoFile for a dsym', async () => {
        const files = await createMachoFiles('spec/support/bugsplat.app.dSYM');
        const file = files[0];
        const uuid = await file.getUUID();
        expect(files.length).toEqual(1);
        expect(uuid).toEqual('ac15902fba2e31c18b29da51e889b321');
        expect(file.path).toEqual('spec/support/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat');
    });

    it('should return MachoFiles for a framework', async () => {
        const expected = new Map([
            ['c3e6032cb73e39d59d872acc2a515240', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/bugsplat'],
            ['39d9cb72de663ca6b85bbfa04b60782e', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
            ['7f2b35c3974533d1b991ec0da93cc085', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
        ]);
        const files = await createMachoFiles('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework');
        
        for (const file of files) {
            const uuid = await file.getUUID();
            const path = file.path;
            expect(expected.get(uuid)).toEqual(path);
        }
    });

    it('should return MachoFiles for a bundle', async () => {
        const expected = new Map([
            ['39d9cb72de663ca6b85bbfa04b60782e', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
            ['7f2b35c3974533d1b991ec0da93cc085', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
        ]);
        const files = await createMachoFiles('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle');
        
        for (const file of files) {
            const uuid = await file.getUUID();
            const path = file.path;
            expect(expected.get(uuid)).toEqual(path);
        }
    });

    // TODO BG we should probably dive deeper here... perhaps we want to always pick the dSYM regardless of size?
    it('should return MachoFiles for xcarchive filtering out duplicates based on largest size', async () => {
        const expected = new Map([
            ['e7647c7b5fac31cea802ba1d33948697', 'spec/support/bugsplat.xcarchive/dSYMs/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat'],
            ['eb307a227d663ccf8061cfabf3f9f40b', 'spec/support/bugsplat.xcarchive/dSYMs/bugsplat.app.dSYM/Contents/Resources/DWARF/bugsplat'],
            ['bd44d32ef7bb357c97e9e153c9afc1e2', 'spec/support/bugsplat.xcarchive/Products/Applications/bugsplat.app/Contents/Frameworks/bugsplat.framework/Versions/A/bugsplat'],
            ['bd29d69f1688362f81ae2e781d86c77e', 'spec/support/bugsplat.xcarchive/Products/Applications/bugsplat.app/Contents/Frameworks/bugsplat.framework/Versions/A/bugsplat']
        ]);
        const files = await createMachoFiles('spec/support/bugsplat.xcarchive');
        
        for (const file of files) {
            const uuid = await file.getUUID();
            const path = file.path;
            expect(expected.get(uuid)).toEqual(path);
        }
    });
});
