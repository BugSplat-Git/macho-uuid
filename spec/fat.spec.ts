import { createMachoFiles } from '../src/factory';
import { FatFile } from '../src/fat';

describe('FatFile', () => {
    describe('getMachos', () => {
        it('should return MachoFiles for app containing a Universal Binary', async () => {
            const expected = new Map([
                ['39d9cb72de663ca6b85bbfa04b60782e', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources'],
                ['7f2b35c3974533d1b991ec0da93cc085', 'spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources']
            ]);
            const files = await createMachoFiles('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources');
        
            for (const file of files) {
                const uuid = await file.getUUID();
                const path = file.path;
                expect(expected.get(uuid)).toEqual(path);
            }
        });

        it('should return MachoFiles for fat dylib', async () => {
            const expected = new Map([
                ['6c40dc26058937a89df8060647aa0d35', 'spec/support/libggcurl.dylib'],
                ['e7e2a3aa880b3b5386c2b618771528ff', 'spec/support/libggcurl.dylib']
            ]);
            const files = await createMachoFiles('spec/support/libggcurl.dylib');
        
            for (const file of files) {
                const uuid = await file.getUUID();
                const path = file.path;
                expect(expected.get(uuid)).toEqual(path);
            }
        });
    });
    
    describe('isFat', () => {
        it('should return false if file is not a fat binary', async () => 
            expectAsync(FatFile.isFat('spec/support/bugsplat.app.dSYM')).toBeResolvedTo(false)
        );
    
        it('should return true if file is a fat binary', async () => 
            expectAsync(FatFile.isFat('spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources')).toBeResolvedTo(true)
        );
    });
});