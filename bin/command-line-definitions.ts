import { OptionDefinition as ArgDefinition } from "command-line-args";
import { OptionDefinition as UsageDefinition, Section } from "command-line-usage";

export type CommandLineDefinition = ArgDefinition & UsageDefinition;

export const argDefinitions: Array<CommandLineDefinition> = [
    {
        name: 'path',
        type: String,
        defaultOption: true,
        typeLabel: '{underline string}',
        description: 'Path to a .app, .dSYM, or macOS binary file.',
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Print this usage guide.'
    },
];

export const usageDefinitions: Array<Section> = [
    {
        header: 'macho-uuid',
        content: 'A command line utility and library for reading the UUID of a .app, .dSYM, or macOS binary file.',
    },
    {
        header: 'Usage',
        optionList: argDefinitions
    },
    {
        header: 'Example',
        content: [
            'macho-uuid {italic path-to-app-dsym-or-macos-binary-file}',
        ]
    },
    {
        header: 'Links',
        content: 
        [
            '🐛 {underline https://bugsplat.com}',
            '',
            '💻 {underline https://github.com/BugSplat-Git/macho-uuid}',
            '',
            '💌 {underline support@bugsplat.com}'
        ]
    }
];