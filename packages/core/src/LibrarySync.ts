/**
 * LibrarySync - Fetches and caches rules from remote repository
 * Allows rule updates without NPM upgrades
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface LibrarySyncResult {
    updated: number;
    cached: number;
    errors: string[];
}

export interface RuleManifest {
    version: string;
    lastUpdated: string;
    files: string[];
}

/**
 * LibrarySync class for remote rule fetching
 */
export class LibrarySync {
    private cacheDir: string;
    private repoBaseUrl: string;

    constructor(
        repoUrl: string = 'https://raw.githubusercontent.com/mohitmishra786/never/main/library'
    ) {
        this.cacheDir = join(homedir(), '.never', 'library');
        this.repoBaseUrl = repoUrl;
    }

    /**
     * Ensure cache directory exists
     */
    private ensureCacheDir(): void {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Fetch content from a URL
     */
    private async fetchUrl(url: string): Promise<string | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            return await response.text();
        } catch {
            return null;
        }
    }

    /**
     * Get the manifest of available rule files
     */
    async fetchManifest(): Promise<RuleManifest | null> {
        const manifestUrl = `${this.repoBaseUrl}/manifest.json`;
        const content = await this.fetchUrl(manifestUrl);

        if (!content) {
            // Fallback: try to infer files from known structure
            return {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                files: [
                    'core/safety.md',
                    'core/accuracy.md',
                    'core/tone.md',
                    'typescript/never-ts.md',
                    'react/never-react.md',
                    'python/never-python.md',
                ],
            };
        }

        try {
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Pull latest rules from remote repository
     */
    async pull(): Promise<LibrarySyncResult> {
        this.ensureCacheDir();

        const result: LibrarySyncResult = {
            updated: 0,
            cached: 0,
            errors: [],
        };

        const manifest = await this.fetchManifest();
        if (!manifest) {
            result.errors.push('Failed to fetch manifest');
            return result;
        }

        // Save manifest
        writeFileSync(
            join(this.cacheDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2),
            'utf-8'
        );

        // Fetch each rule file
        for (const filePath of manifest.files) {
            const url = `${this.repoBaseUrl}/${filePath}`;
            const localPath = join(this.cacheDir, filePath);
            const localDir = join(this.cacheDir, filePath.split('/')[0]);

            // Ensure subdirectory exists
            if (!existsSync(localDir)) {
                mkdirSync(localDir, { recursive: true });
            }

            const content = await this.fetchUrl(url);

            if (content) {
                // Check if file changed
                const existingContent = existsSync(localPath)
                    ? readFileSync(localPath, 'utf-8')
                    : null;

                if (existingContent !== content) {
                    writeFileSync(localPath, content, 'utf-8');
                    result.updated++;
                } else {
                    result.cached++;
                }
            } else {
                result.errors.push(`Failed to fetch: ${filePath}`);
            }
        }

        return result;
    }

    /**
     * Check if cache exists and is valid
     */
    isCached(): boolean {
        const manifestPath = join(this.cacheDir, 'manifest.json');
        return existsSync(manifestPath);
    }

    /**
     * Get the library path (prefers cache, falls back to bundled)
     */
    getLibraryPath(bundledPath?: string): string {
        if (this.isCached()) {
            return this.cacheDir;
        }

        if (bundledPath && existsSync(bundledPath)) {
            return bundledPath;
        }

        // Return cache dir anyway (will be empty)
        return this.cacheDir;
    }

    /**
     * Get cached manifest info
     */
    getCacheInfo(): { version: string; lastUpdated: string; fileCount: number } | null {
        const manifestPath = join(this.cacheDir, 'manifest.json');

        if (!existsSync(manifestPath)) {
            return null;
        }

        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
            return {
                version: manifest.version,
                lastUpdated: manifest.lastUpdated,
                fileCount: manifest.files?.length || 0,
            };
        } catch {
            return null;
        }
    }

    /**
     * List all cached rule files
     */
    listCachedFiles(): string[] {
        if (!existsSync(this.cacheDir)) {
            return [];
        }

        const files: string[] = [];

        const walkDir = (dir: string, prefix: string = ''): void => {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(join(prefix, entry.name));
                } else if (entry.isDirectory()) {
                    walkDir(join(dir, entry.name), join(prefix, entry.name));
                }
            }
        };

        walkDir(this.cacheDir);
        return files;
    }
}

/**
 * Create a LibrarySync instance
 */
export function createLibrarySync(repoUrl?: string): LibrarySync {
    return new LibrarySync(repoUrl);
}
