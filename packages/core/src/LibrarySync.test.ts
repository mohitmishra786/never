/**
 * Tests for LibrarySync - corporate proxy error handling and caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LibrarySync } from './LibrarySync.js';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LibrarySync', () => {
    let testCacheDir: string;
    let librarySync: LibrarySync;

    beforeEach(() => {
        testCacheDir = join(tmpdir(), `never-cache-test-${Date.now()}`);
        mkdirSync(testCacheDir, { recursive: true });

        // Override the cache directory for testing
        librarySync = new LibrarySync();
        // @ts-ignore - accessing private property for testing
        librarySync.cacheDir = testCacheDir;
    });

    afterEach(() => {
        if (existsSync(testCacheDir)) {
            rmSync(testCacheDir, { recursive: true, force: true });
        }
        vi.restoreAllMocks();
    });

    describe('isCached', () => {
        it('should return false when no cache exists', () => {
            expect(librarySync.isCached()).toBe(false);
        });

        it('should return true when manifest exists', () => {
            writeFileSync(join(testCacheDir, 'manifest.json'), '{"version":"1.0.0"}');
            expect(librarySync.isCached()).toBe(true);
        });
    });

    describe('getCacheInfo', () => {
        it('should return null when no cache exists', () => {
            expect(librarySync.getCacheInfo()).toBe(null);
        });

        it('should return cache info when manifest exists', () => {
            const manifest = {
                version: '1.0.0',
                lastUpdated: '2024-01-01',
                files: ['core/safety.md', 'typescript/never-ts.md']
            };
            writeFileSync(join(testCacheDir, 'manifest.json'), JSON.stringify(manifest));

            const info = librarySync.getCacheInfo();
            expect(info).toEqual({
                version: '1.0.0',
                lastUpdated: '2024-01-01',
                fileCount: 2
            });
        });
    });

    describe('getLibraryPath', () => {
        it('should prefer cached path when available', () => {
            writeFileSync(join(testCacheDir, 'manifest.json'), '{}');
            expect(librarySync.getLibraryPath()).toBe(testCacheDir);
        });

        it('should use bundled path when cache not available', () => {
            const bundledPath = join(tmpdir(), 'never-bundled-test');
            mkdirSync(bundledPath, { recursive: true });

            try {
                const path = librarySync.getLibraryPath(bundledPath);
                expect(path).toBe(bundledPath);
            } finally {
                rmSync(bundledPath, { recursive: true, force: true });
            }
        });
    });

    describe('pull with local-only mode', () => {
        it('should skip network fetch in local-only mode', async () => {
            const result = await librarySync.pull(true);

            expect(result.updated).toBe(0);
            expect(result.cached).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('local-only mode');
        });
    });

    describe('listCachedFiles', () => {
        it('should return empty array when no cache exists', () => {
            const files = librarySync.listCachedFiles();
            expect(files).toEqual([]);
        });

        it('should list cached markdown files', () => {
            mkdirSync(join(testCacheDir, 'core'), { recursive: true });
            mkdirSync(join(testCacheDir, 'typescript'), { recursive: true });

            writeFileSync(join(testCacheDir, 'core', 'safety.md'), '# Safety');
            writeFileSync(join(testCacheDir, 'typescript', 'never-ts.md'), '# TypeScript');
            writeFileSync(join(testCacheDir, 'manifest.json'), '{}'); // Not a .md file

            const files = librarySync.listCachedFiles();

            expect(files).toHaveLength(2);
            expect(files.some(f => f.includes('safety.md'))).toBe(true);
            expect(files.some(f => f.includes('never-ts.md'))).toBe(true);
            expect(files.some(f => f.includes('manifest.json'))).toBe(false);
        });

        it('should list files from deep nested structures (stacks/agents)', () => {
            mkdirSync(join(testCacheDir, 'stacks'), { recursive: true });
            mkdirSync(join(testCacheDir, 'agents'), { recursive: true });

            writeFileSync(join(testCacheDir, 'stacks', 'react-typescript.md'), '# React');
            writeFileSync(join(testCacheDir, 'agents', 'claude-code.md'), '# Claude');

            const files = librarySync.listCachedFiles();

            expect(files).toHaveLength(2);
            expect(files.some(f => f.includes('stacks/react-typescript.md'))).toBe(true);
            expect(files.some(f => f.includes('agents/claude-code.md'))).toBe(true);
        });
    });

    describe('corporate proxy error handling', () => {
        it('should handle network timeouts gracefully', async () => {
            // Mock fetch to simulate timeout
            global.fetch = vi.fn().mockImplementation(() => {
                return new Promise((_, reject) => {
                    const error = new Error('AbortError');
                    error.name = 'AbortError';
                    reject(error);
                });
            });

            try {
                const result = await librarySync.pull();

                // If it doesn't throw, check the errors array
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors.some(e => e.includes('NETWORK_TIMEOUT'))).toBe(true);
            } catch (error) {
                // If it throws, check the error message
                expect(error).toBeDefined();
                expect((error as Error).message).toContain('NETWORK_TIMEOUT');
            }
        });

        it('should detect corporate proxy blocks', async () => {
            // Mock fetch to simulate corporate proxy 404
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                text: async () => 'Artifactory proxy error'
            } as Response);

            const result = await librarySync.pull();

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e =>
                e.includes('CORPORATE_PROXY_BLOCK') || e.includes('CORPORATE_')
            )).toBe(true);
        });

        it('should detect authentication failures', async () => {
            // Mock fetch to simulate 401 Unauthorized
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                text: async () => ''
            } as Response);

            const result = await librarySync.pull();

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('CORPORATE_REGISTRY_AUTH'))).toBe(true);
        });
    });

    describe('path traversal protection', () => {
        it('should reject paths with ..', async () => {
            // Mock successful manifest fetch with malicious path
            global.fetch = vi.fn().mockImplementation((url) => {
                if (url.toString().includes('manifest.json')) {
                    return Promise.resolve({
                        ok: true,
                        text: async () => JSON.stringify({
                            version: '1.0.0',
                            lastUpdated: new Date().toISOString(),
                            files: ['../../etc/passwd']
                        })
                    } as Response);
                }
                return Promise.reject(new Error('Not found'));
            });

            const result = await librarySync.pull();

            expect(result.errors.some(e => e.includes('traversal detected'))).toBe(true);
        });

        it('should reject absolute paths', async () => {
            global.fetch = vi.fn().mockImplementation((url) => {
                if (url.toString().includes('manifest.json')) {
                    return Promise.resolve({
                        ok: true,
                        text: async () => JSON.stringify({
                            version: '1.0.0',
                            lastUpdated: new Date().toISOString(),
                            files: ['/etc/passwd']
                        })
                    } as Response);
                }
                return Promise.reject(new Error('Not found'));
            });

            const result = await librarySync.pull();

            expect(result.errors.some(e => e.includes('traversal detected'))).toBe(true);
        });
    });
});
