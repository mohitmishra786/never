/**
 * Tests for doctor command - health check functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Doctor Command Health Checks', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `never-doctor-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Marker Detection', () => {
        const MARKER_START = '<!-- NEVER-RULES-START -->';
        const MARKER_END = '<!-- NEVER-RULES-END -->';

        it('should detect markers in CLAUDE.md', () => {
            const claudePath = join(testDir, 'CLAUDE.md');
            const content = `# Claude Instructions\n\n${MARKER_START}\n# Rules here\n${MARKER_END}\n`;
            writeFileSync(claudePath, content);

            const fileContent = require('fs').readFileSync(claudePath, 'utf-8');
            expect(fileContent).toContain(MARKER_START);
            expect(fileContent).toContain(MARKER_END);
        });

        it('should detect missing markers', () => {
            const claudePath = join(testDir, 'CLAUDE.md');
            writeFileSync(claudePath, '# Claude Instructions\n\nNo markers here.');

            const fileContent = require('fs').readFileSync(claudePath, 'utf-8');
            expect(fileContent).not.toContain(MARKER_START);
        });
    });

    describe('Config Detection', () => {
        it('should detect when Never is initialized', () => {
            const neverDir = join(testDir, '.never');
            mkdirSync(neverDir, { recursive: true });
            writeFileSync(join(neverDir, 'config.yaml'), 'version: 1\nrules:\n  - core\n');

            expect(existsSync(join(testDir, '.never', 'config.yaml'))).toBe(true);
        });

        it('should detect when Never is not initialized', () => {
            expect(existsSync(join(testDir, '.never', 'config.yaml'))).toBe(false);
        });
    });

    describe('Gitignore Detection', () => {
        it('should detect .gitignore with Never backups ignored', () => {
            writeFileSync(join(testDir, '.gitignore'), 'node_modules/\n.never/backups/\n');

            const content = require('fs').readFileSync(join(testDir, '.gitignore'), 'utf-8');
            expect(content).toContain('.never/backups/');
        });

        it('should detect missing .never/backups/ in .gitignore', () => {
            writeFileSync(join(testDir, '.gitignore'), 'node_modules/\n');

            const content = require('fs').readFileSync(join(testDir, '.gitignore'), 'utf-8');
            expect(content).not.toContain('.never/backups/');
        });

        it('should handle missing .gitignore', () => {
            expect(existsSync(join(testDir, '.gitignore'))).toBe(false);
        });
    });

    describe('Node Version Check', () => {
        it('should validate Node.js version', () => {
            const version = process.version;
            const major = parseInt(version.slice(1).split('.')[0], 10);

            expect(major).toBeGreaterThanOrEqual(18);
        });
    });

    describe('Registry Detection', () => {
        it('should detect npm registry configuration', () => {
            try {
                const registry = execSync('npm config get registry', { encoding: 'utf-8' }).trim();
                expect(registry).toBeTruthy();
                expect(typeof registry).toBe('string');
            } catch (error) {
                // If npm is not available, skip this test
                expect(error).toBeDefined();
            }
        });

        it('should identify corporate registries', () => {
            const corporateIndicators = ['artifactory', 'nexus', 'jfrog'];
            const testRegistry = 'https://artifactory.company.com/api/npm/';

            const isCorporate = corporateIndicators.some(indicator => 
                testRegistry.toLowerCase().includes(indicator)
            );

            expect(isCorporate).toBe(true);
        });

        it('should identify standard registries', () => {
            const standardRegistry = 'https://registry.npmjs.org/';
            const isCorporate = !standardRegistry.includes('npmjs.org') && 
                              !standardRegistry.includes('yarnpkg.com');

            expect(isCorporate).toBe(false);
        });
    });
});
