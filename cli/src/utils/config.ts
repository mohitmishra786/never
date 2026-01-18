/**
 * Configuration management for Never CLI
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
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

/**
 * Locate the project's `library` directory by checking common candidate locations relative to this module and the current working directory.
 *
 * @returns The filesystem path to the found `library` directory.
 * @throws Error if none of the expected library locations exist; the thrown error message lists the candidate paths.
 */
export function getLibraryPath(): string {
    // Use fileURLToPath for proper cross-platform path handling
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const possiblePaths = [
        // Local development (from dist/utils/)
        join(__dirname, '..', '..', 'library'),
        // From dist/commands/ when called from there
        join(__dirname, '..', '..', '..', 'library'),
        // Local library in current project
        join(process.cwd(), 'library'),
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    // No valid library path found - throw error to let caller handle
    throw new Error(
        'Never library not found. Ensure it exists in one of the expected locations:\n' +
        possiblePaths.map(p => `  - ${p}`).join('\n')
    );
}