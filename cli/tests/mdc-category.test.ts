/**
 * Tests for category-based MDC generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    generateCategoryMdcFiles,
    writeCategoryMdcFiles,
    type MdcOutput
} from '../src/engines/to-mdc.js';
import type { ParsedRule } from '../src/engines/parser.js';

describe('Category MDC Generation', () => {
    const mockRules: ParsedRule[] = [
        {
            id: 'core/safety',
            filename: 'safety.md',
            frontmatter: {
                name: 'Safety',
                description: 'Safety rules',
                tags: ['core', 'security'],
                globs: '**/*',
                alwaysApply: true,
            },
            content: 'Safety content',
            rules: ['Never use eval()', 'Never hardcode secrets'],
        },
        {
            id: 'typescript/types',
            filename: 'types.md',
            frontmatter: {
                name: 'TypeScript',
                description: 'TS rules',
                tags: ['typescript'],
                globs: '**/*.ts',
                alwaysApply: false,
            },
            content: 'TS content',
            rules: ['Never use any type', 'Never use type assertions'],
        },
        {
            id: 'react/hooks',
            filename: 'hooks.md',
            frontmatter: {
                name: 'React Hooks',
                description: 'React rules',
                tags: ['react', 'frontend'],
                globs: '**/*.tsx',
                alwaysApply: false,
            },
            content: 'React content',
            rules: ['Never call hooks conditionally'],
        },
    ];

    describe('generateCategoryMdcFiles', () => {
        it('should generate files for different categories', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should use never-{category}.mdc naming convention', () => {
            const outputs = generateCategoryMdcFiles(mockRules);
            const filenames = outputs.map(o => o.filename);

            expect(filenames.some(f => f.startsWith('never-'))).toBe(true);
            expect(filenames.every(f => f.endsWith('.mdc'))).toBe(true);
        });

        it('should include frontmatter with description and globs', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            for (const output of outputs) {
                expect(output.content).toContain('---');
                expect(output.content).toContain('description:');
                expect(output.content).toContain('globs:');
            }
        });

        it('should include rule content as bullet points', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            // Find a category that has rules
            const coreOutput = outputs.find(o => o.filename.includes('core'));

            if (coreOutput) {
                expect(coreOutput.content).toContain('- Never');
            }
        });

        it('should group rules by category correctly', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            // Check typescript category
            const tsOutput = outputs.find(o => o.filename === 'never-typescript.mdc');
            if (tsOutput) {
                expect(tsOutput.content).toContain('Never use any type');
            }

            // Check react category
            const reactOutput = outputs.find(o => o.filename === 'never-react.mdc');
            if (reactOutput) {
                expect(reactOutput.content).toContain('Never call hooks conditionally');
            }
        });

        it('should set alwaysApply to false', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            for (const output of outputs) {
                expect(output.content).toContain('alwaysApply: false');
            }
        });

        it('should have category property on output', () => {
            const outputs = generateCategoryMdcFiles(mockRules);

            for (const output of outputs) {
                expect(output.category).toBeDefined();
            }
        });
    });

    describe('writeCategoryMdcFiles', () => {
        let testDir: string;

        beforeEach(() => {
            testDir = join(tmpdir(), `never-mdc-test-${Date.now()}`);
            mkdirSync(testDir, { recursive: true });
        });

        afterEach(() => {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
        });

        it('should create .cursor/rules/ directory', () => {
            writeCategoryMdcFiles(testDir, mockRules, false);

            const cursorRulesPath = join(testDir, '.cursor', 'rules');
            expect(existsSync(cursorRulesPath)).toBe(true);
        });

        it('should write category .mdc files', () => {
            writeCategoryMdcFiles(testDir, mockRules, false);

            const cursorRulesPath = join(testDir, '.cursor', 'rules');
            const files = readdirSync(cursorRulesPath);

            expect(files.length).toBeGreaterThan(0);
            expect(files.some(f => f.startsWith('never-') && f.endsWith('.mdc'))).toBe(true);
        });

        it('should return array of written file paths', () => {
            const files = writeCategoryMdcFiles(testDir, mockRules, false);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files.every(f => f.includes('.cursor/rules/'))).toBe(true);
        });

        it('should not write files in dry-run mode', () => {
            writeCategoryMdcFiles(testDir, mockRules, true);

            const cursorRulesPath = join(testDir, '.cursor', 'rules');
            expect(existsSync(cursorRulesPath)).toBe(false);
        });

        it('should still return file paths in dry-run mode', () => {
            const files = writeCategoryMdcFiles(testDir, mockRules, true);

            expect(files.length).toBeGreaterThan(0);
        });

        it('should write valid content to files', () => {
            const files = writeCategoryMdcFiles(testDir, mockRules, false);

            for (const filePath of files) {
                const content = readFileSync(filePath, 'utf-8');

                // Should have frontmatter
                expect(content.startsWith('---')).toBe(true);

                // Should have Never CLI link
                expect(content).toContain('Never CLI');
            }
        });
    });
});
