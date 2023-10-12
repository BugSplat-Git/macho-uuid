[![bugsplat-github-banner-basic-outline](https://user-images.githubusercontent.com/20464226/149019306-3186103c-5315-4dad-a499-4fd1df408475.png)](https://bugsplat.com)
<br/>
# <div align="center">BugSplat</div> 
### **<div align="center">Crash and error reporting built for busy developers.</div>**
<div align="center">
    <a href="https://twitter.com/BugSplatCo">
        <img alt="Follow @bugsplatco on Twitter" src="https://img.shields.io/twitter/follow/bugsplatco?label=Follow%20BugSplat&style=social">
    </a>
    <a href="https://discord.gg/bugsplat">
        <img alt="Join BugSplat on Discord" src="https://img.shields.io/discord/664965194799251487?label=Join%20Discord&logo=Discord&style=social">
    </a>
</div>

<br/>

# macho-uuid

A nifty little library for reading unique identifiers from .app, .dSYM, .bundle, .xcarchive, .framework, or macOS binary files.

## Command Line

1. Install this package globally `npm i -g macho-uuid`
2. Run macho-uuid with `-h` to see the latest usage information:

```bash
bobby@BugSplat % ~ % macho-uuid -h

macho-uuid

  A command line utility and library for reading the UUID of a .app, .dSYM,     
  .bundle, .xcarchive, .framework, or macOS binary file.

Usage

  --path string   Path to a .app, .dSYM, .bundle, .xcarchive, .framework, or
                  macOS binary file.
  -h, --help      Print this usage guide.

Example

  macho-uuid path-to-macho-bundle-or-fat-file 

Links

  🐛 https://bugsplat.com
 
  💻 https://github.com/BugSplat-Git/macho-uuid
                                                
  💌 support@bugsplat.com
```

3. Run macho-uuid specifying a path to a `.app`, `.dSYM`, `.bundle`, `.xcarchive`, `.framework`, or macOS binary file:

```bash
bobby@BugSplat % ~ % macho-uuid ./path/to/bugsplat-ios.app
UUID: 59686D50-E0A4-3FB9-AD27-BAADAD47E0BC (arm64) spec/support/bugsplat-ios.app/bugsplat-ios
UUID: C3E6032C-B73E-39D5-9D87-2ACC2A515240 (arm64) spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/bugsplat
UUID: 39D9CB72-DE66-3CA6-B85B-BFA04B60782E (x86_64) spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources
UUID: 7F2B35C3-9745-33D1-B991-EC0DA93CC085 (arm64) spec/support/bugsplat-ios.app/Frameworks/bugsplat.framework/HockeySDKResources.bundle/Contents/MacOS/HockeySDKResources
```

## API

1. Install this package locally `npm i macho-uuid`.
2. Use the `createMachoFiles` factory to recursively create an array of `MachoFile` instances for a given path.

```ts
import { createMachoFiles } from 'macho-uuid';
const machoFiles = await createMachoFiles('./path/to/bugsplat.app');
```
3. Await a call to `getUUID()` to get the unique identifier for the file.

```ts
const uuid = await machoFile.getUUID();
```

## 🐛 About

[BugSplat](https://bugsplat.com) is a software crash and error reporting service with support for [macOS](https://docs.bugsplat.com/introduction/getting-started/integrations/desktop/macos), [iOS](https://docs.bugsplat.com/introduction/getting-started/integrations/mobile/ios), [Qt](https://docs.bugsplat.com/introduction/getting-started/integrations/cross-platform/qt), [Unreal Engine](https://docs.bugsplat.com/introduction/getting-started/integrations/game-development/unreal-engine) and [many more](https://docs.bugsplat.com/introduction/getting-started/integrations). BugSplat automatically captures critical diagnostic data such as stack traces, log files, and other runtime information. BugSplat also provides automated incident notifications, a convenient dashboard for monitoring trends and prioritizing engineering efforts, and integrations with popular development tools to maximize productivity and ship more profitable software.
