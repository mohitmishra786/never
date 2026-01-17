/**
 * Configuration management for Never CLI
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import YAML from 'yaml';

export interface NeverConfig {
    version: number;
    rules: string[];
    targets: {
        cursor: boolean;
        claude: boolean;
        agents: boolean;
        windsurf?: boolean;
    };
    autoDetect: boolean;
    customRules?: string;
}

const DEFAULT_CONFIG: NeverConfig = {
    version: 1,
    rules: ['core'],
    targets: {
        cursor: true,
        claude: true,
        agents: true,
    },
    autoDetect: true,
};

export function loadConfig(configPath: string): NeverConfig | null {
    if (!existsSync(configPath)) {
        return null;
    }

    try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = YAML.parse(content) as Partial<NeverConfig>;

        // Merge with defaults
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
            targets: {
                ...DEFAULT_CONFIG.targets,
                ...parsed.targets,
            },
        };
    } catch (error) {
        console.error(`Failed to parse config at ${configPath}:`, error);
        return null;
    }
}

export function saveConfig(configPath: string, config: NeverConfig): void {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const content = YAML.stringify(config, {
        indent: 2,
        lineWidth: 0,
    });

    // Add comments to the config
    const commentedContent = `# Never CLI Configuration
# https://github.com/mohitmishra786/never

${content}`;

    writeFileSync(configPath, commentedContent, 'utf-8');
}

export function createDefaultConfig(rules: string[]): NeverConfig {
    return {
        ...DEFAULT_CONFIG,
        rules,
    };
}

export function getLibraryPath(): string {
    // First check if we're running from the never repo itself
    const possiblePaths = [
        // Local development
        new URL('../../library', import.meta.url).pathname,
        // Linked globally
        new URL('../../../library', import.meta.url).pathname,
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    // Default to relative path
    return './library';
}
