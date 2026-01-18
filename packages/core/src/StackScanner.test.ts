/**
 * Tests for StackScanner - .gitignore respect and project detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject, suggestRuleSets, generateStackSummary } from './StackScanner.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('StackScanner', () => {
    let testDir: string;

    beforeEach(() => {
        // Create a temporary test directory
        testDir = join(tmpdir(), `never-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up test directory
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('detectProject', () => {
        it('should detect TypeScript projects', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            const result = detectProject(testDir);
            
            expect(result.hasTypeScript).toBe(true);
            expect(result.frameworks).toContain('typescript');
            expect(result.stacks.some(s => s.name === 'TypeScript')).toBe(true);
        });

        it('should detect Python projects', () => {
            writeFileSync(join(testDir, 'requirements.txt'), 'flask==2.0.0');
            const result = detectProject(testDir);
            
            expect(result.hasPython).toBe(true);
            expect(result.frameworks).toContain('python');
        });

        it('should detect React projects', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            const result = detectProject(testDir);
            
            expect(result.hasReact).toBe(true);
            expect(result.hasNode).toBe(true);
        });

        it('should detect environment files', () => {
            writeFileSync(join(testDir, '.env'), 'API_KEY=secret');
            const result = detectProject(testDir);
            
            expect(result.hasEnvFiles).toBe(true);
            expect(result.stacks.some(s => s.name === 'Environment Config')).toBe(true);
        });

        it('should detect component directories', () => {
            mkdirSync(join(testDir, 'src', 'components'), { recursive: true });
            writeFileSync(join(testDir, 'src', 'components', 'Button.tsx'), '');
            const result = detectProject(testDir);
            
            expect(result.hasComponents).toBe(true);
        });

        it('should respect .gitignore and skip node_modules', () => {
            // Create .gitignore
            writeFileSync(join(testDir, '.gitignore'), 'node_modules/\ntest-ignored/');
            
            // Create directories that should be ignored
            mkdirSync(join(testDir, 'node_modules', 'some-package'), { recursive: true });
            mkdirSync(join(testDir, 'test-ignored', 'components'), { recursive: true });
            
            // Create valid component directory
            mkdirSync(join(testDir, 'src', 'components'), { recursive: true });
            
            const result = detectProject(testDir);
            
            // Should find src/components but not test-ignored/components
            expect(result.hasComponents).toBe(true);
        });

        it('should detect Docker setup', () => {
            writeFileSync(join(testDir, 'Dockerfile'), 'FROM node:18');
            const result = detectProject(testDir);
            
            expect(result.hasDocker).toBe(true);
        });

        it('should detect CI/CD setup', () => {
            mkdirSync(join(testDir, '.github', 'workflows'), { recursive: true });
            writeFileSync(join(testDir, '.github', 'workflows', 'ci.yml'), 'name: CI');
            
            // Disable cache to ensure fresh detection
            const result = detectProject(testDir, { maxDepth: 5, useCache: false });
            
            expect(result.hasCI).toBe(true);
        });
    });

    describe('suggestRuleSets', () => {
        it('should always include core rules', () => {
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            expect(rules).toContain('core');
        });

        it('should suggest TypeScript rules for TS projects', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            expect(rules).toContain('typescript');
        });

        it('should suggest Python rules for Python projects', () => {
            writeFileSync(join(testDir, 'requirements.txt'), '');
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            expect(rules).toContain('python');
        });

        it('should suggest React rules for React projects', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            expect(rules).toContain('react');
        });

        it('should suggest security rules when env files exist', () => {
            writeFileSync(join(testDir, '.env'), 'SECRET=test');
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            expect(rules).toContain('security');
        });

        it('should not duplicate rules', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);
            
            // Check no duplicates
            const uniqueRules = [...new Set(rules)];
            expect(rules.length).toBe(uniqueRules.length);
        });
    });

    describe('generateStackSummary', () => {
        it('should generate correct summary for multiple stacks', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            
            const info = detectProject(testDir);
            const summary = generateStackSummary(info);
            
            expect(summary).toMatch(/Found \d+ stacks/);
            expect(summary).toMatch(/Syncing \d+ relevant nevers/);
        });

        it('should handle projects with no stacks', () => {
            const info = detectProject(testDir);
            const summary = generateStackSummary(info);
            
            expect(summary).toContain('Found 0 stacks');
        });
    });
});
