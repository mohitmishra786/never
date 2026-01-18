/**
 * LibrarySync - Fetches and caches rules from remote repository
 * Allows rule updates without NPM upgrades
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname, relative, sep } from 'path';
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
    private repoBaseUrl: string; // Base URL for rule files
    private manifestUrl: string; // Full URL to the manifest.json

    constructor(
        manifestUrl: string = 'https://raw.githubusercontent.com/mohitmishra786/never/main/packages/library/manifest.json'
    ) {
        this.cacheDir = join(homedir(), '.never', 'library');
        this.manifestUrl = manifestUrl;
        this.repoBaseUrl = dirname(manifestUrl); // Extract base URL from manifest URL
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
     * Fetch content from a URL with timeout and corporate proxy detection
     */
    private async fetchUrl(url: string): Promise<string | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(url, { signal: controller.signal });

            // Check for common corporate proxy/registry errors
            if (!response.ok) {
                // 401/403 - Authentication issues (Artifactory, Nexus)
                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        'CORPORATE_REGISTRY_AUTH: Your corporate registry requires authentication. ' +
                        'Try running with --local-only flag or configure your .npmrc with proper credentials.'
                    );
                }

                // 404 - Resource not found (could be blocked by corporate proxy)
                if (response.status === 404) {
                    // Try to detect if it's a corporate proxy issue
                    const responseText = await response.text().catch(() => '');
                    if (responseText.includes('artifactory') ||
                        responseText.includes('nexus') ||
                        responseText.includes('jfrog') ||
                        responseText.includes('corporate') ||
                        responseText.toLowerCase().includes('proxy')) {
                        throw new Error(
                            'CORPORATE_PROXY_BLOCK: Your corporate proxy is blocking access to GitHub. ' +
                            'Try using a VPN or run: never sync --local-only'
                        );
                    }
                }

                return null;
            }

            return await response.text();
        } catch (error) {
            // Re-throw our custom errors
            if (error instanceof Error && error.message.startsWith('CORPORATE_')) {
                throw error;
            }

            // Handle abort/timeout
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(
                    'NETWORK_TIMEOUT: Request timed out. This could be due to a slow corporate proxy. ' +
                    'Try running: never sync --local-only'
                );
            }

            // Handle other network errors
            if (error instanceof TypeError) {
                throw new Error(
                    'NETWORK_ERROR: Could not reach GitHub. Check your internet connection or firewall settings. ' +
                    'If behind a corporate proxy, try: never sync --local-only'
                );
            }

            return null;
        } finally {
            clearTimeout(timeout);
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
     * Pull latest rules from remote repository with corporate environment handling
     */
    async pull(localOnly: boolean = false): Promise<LibrarySyncResult> {
        this.ensureCacheDir();

        const result: LibrarySyncResult = {
            updated: 0,
            cached: 0,
            errors: [],
        };

        // If local-only mode, skip network fetch
        if (localOnly) {
            result.errors.push('Running in local-only mode (skipping remote fetch)');
            return result;
        }

        let manifest: RuleManifest | null = null;

        try {
            manifest = await this.fetchManifest();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('CORPORATE_')) {
                // Corporate proxy/registry error - provide helpful message
                result.errors.push(error.message);
                return result;
            }
            throw error;
        }

        if (!manifest) {
            result.errors.push('Failed to fetch manifest (no response from server)');
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
            // Normalize and validate path to prevent directory traversal
            const resolvedPath = resolve(this.cacheDir, filePath);

            // Ensure the resolved path is within the cache directory
            // Use path.relative to check for traversal (..) or absolute paths
            const relativePath = relative(this.cacheDir, resolvedPath);
            if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
                result.errors.push(`Invalid path (traversal detected): ${filePath}`);
                continue;
            }

            // Additional check: resolved path must start with cacheDir + separator
            if (!resolvedPath.startsWith(this.cacheDir + sep)) {
                result.errors.push(`Invalid path (traversal detected): ${filePath}`);
                continue;
            }

            const url = `${this.repoBaseUrl}/${filePath}`;
            const localPath = resolvedPath;
            const localDir = dirname(localPath);

            // Ensure subdirectory exists
            if (!existsSync(localDir)) {
                mkdirSync(localDir, { recursive: true });
            }

            try {
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
            } catch (error) {
                // Handle corporate proxy errors gracefully
                if (error instanceof Error && error.message.startsWith('CORPORATE_')) {
                    result.errors.push(error.message);
                    // Stop trying to fetch more files if we hit a corporate proxy issue
                    break;
                }
                result.errors.push(`Failed to fetch ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
