/**
 * Config Utilities
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import YAML from 'yaml';

export interface NeverConfig {
    version: number;
    rules: string[];
    targets: {
        cursor: boolean;
        claude: boolean;
        agents: boolean;
    };
    autoDetect: boolean;
}

/**
 * Load configuration from .never/config.yaml
 */
export function loadConfig(projectPath: string): NeverConfig | null {
    const configPath = join(projectPath, '.never', 'config.yaml');

    if (!existsSync(configPath)) {
        return null;
    }

    try {
        const content = readFileSync(configPath, 'utf-8');
        return YAML.parse(content);
    } catch {
        return null;
    }
}

/**
 * Get library path
 */
export function getLibraryPath(bundledPath?: string): string {
    const userLibrary = join(homedir(), '.never', 'library');
    if (existsSync(userLibrary)) {
        return userLibrary;
    }
    return bundledPath || userLibrary;
}
