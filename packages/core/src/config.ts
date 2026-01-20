/**
 * Config Utilities
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

// Get __dirname in both ESM and CJS contexts (for VS Code extension bundling)
function getDirname(): string {
    // Try ESM first (import.meta.url)
    try {
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            return dirname(fileURLToPath(import.meta.url));
        }
    } catch {
        // Fallback for CJS bundled context
    }
    // CJS fallback - __dirname is available globally in CJS
    // When bundled by esbuild, the bundler will replace this with the correct path
    return __dirname;
}

const currentDirname = getDirname();

export interface NeverConfig {
    version: number;
    rules: string[];
    targets: {
        cursor: boolean;
        claude: boolean;
        copilot: boolean;
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
 * Priority: 1. User cache (~/.never/library), 2. Bundled library, 3. fallback
 */
export function getLibraryPath(bundledPath?: string): string {
    // Check user cache first (from `never pull`)
    const userLibrary = join(homedir(), '.never', 'library');
    if (existsSync(userLibrary)) {
        return userLibrary;
    }

    // Fall back to bundled library (ships with npm package)
    if (bundledPath && existsSync(bundledPath)) {
        return bundledPath;
    }

    // Try to find bundled library relative to this file
    // In production: node_modules/@mohitmishra7/never-core/dist/bundled-library
    const bundledRelative = join(currentDirname, 'bundled-library');
    if (existsSync(bundledRelative)) {
        return bundledRelative;
    }

    // Last resort: return user library path (even if it doesn't exist)
    // This allows library sync to know where to download files
    return userLibrary;
}
