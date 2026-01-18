/**
 * Tests for enhanced StackScanner (detect.ts)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    detectProject,
    suggestRuleSets,
    generateStackSummary,
    type ProjectInfo
} from '../src/utils/detect.js';

describe('StackScanner', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `never-scanner-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('detectProject - Language Detection', () => {
        it('should detect TypeScript projects', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');

            const info = detectProject(testDir);

            expect(info.hasTypeScript).toBe(true);
            expect(info.frameworks).toContain('typescript');
        });

        it('should detect Python projects via pyproject.toml', () => {
            writeFileSync(join(testDir, 'pyproject.toml'), '[project]');

            const info = detectProject(testDir);

            expect(info.hasPython).toBe(true);
            expect(info.frameworks).toContain('python');
        });

        it('should detect Python projects via requirements.txt', () => {
            writeFileSync(join(testDir, 'requirements.txt'), 'flask==2.0');

            const info = detectProject(testDir);

            expect(info.hasPython).toBe(true);
        });

        it('should detect Python projects via Pipfile', () => {
            writeFileSync(join(testDir, 'Pipfile'), '[packages]');

            const info = detectProject(testDir);

            expect(info.hasPython).toBe(true);
        });
    });

    describe('detectProject - Framework Detection', () => {
        it('should detect React from package.json', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));

            const info = detectProject(testDir);

            expect(info.hasReact).toBe(true);
            expect(info.frameworks).toContain('react');
        });

        it('should detect Next.js as React', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { next: '^14.0.0' }
            }));

            const info = detectProject(testDir);

            expect(info.hasReact).toBe(true);
        });

        it('should detect Vue from package.json', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { vue: '^3.0.0' }
            }));

            const info = detectProject(testDir);

            expect(info.hasVue).toBe(true);
            expect(info.frameworks).toContain('vue');
        });

        it('should detect Angular from package.json', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { '@angular/core': '^17.0.0' }
            }));

            const info = detectProject(testDir);

            expect(info.hasAngular).toBe(true);
            expect(info.frameworks).toContain('angular');
        });
    });

    describe('detectProject - Deep Inspection', () => {
        it('should detect .env files', () => {
            writeFileSync(join(testDir, '.env'), 'API_KEY=secret');

            const info = detectProject(testDir);

            expect(info.hasEnvFiles).toBe(true);
            expect(info.stacks.some(s => s.type === 'security')).toBe(true);
        });

        it('should detect .env.local files', () => {
            writeFileSync(join(testDir, '.env.local'), 'SECRET=value');

            const info = detectProject(testDir);

            expect(info.hasEnvFiles).toBe(true);
        });

        it('should detect src/components directory', () => {
            mkdirSync(join(testDir, 'src', 'components'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasComponents).toBe(true);
        });

        it('should detect app/components directory', () => {
            mkdirSync(join(testDir, 'app', 'components'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasComponents).toBe(true);
        });

        it('should detect tests directory', () => {
            mkdirSync(join(testDir, 'tests'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasTests).toBe(true);
            expect(info.stacks.some(s => s.name === 'Testing')).toBe(true);
        });

        it('should detect __tests__ directory', () => {
            mkdirSync(join(testDir, '__tests__'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasTests).toBe(true);
        });

        it('should detect Docker files', () => {
            writeFileSync(join(testDir, 'Dockerfile'), 'FROM node:18');

            const info = detectProject(testDir);

            expect(info.hasDocker).toBe(true);
            expect(info.stacks.some(s => s.name === 'Docker')).toBe(true);
        });

        it('should detect docker-compose.yml', () => {
            writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');

            const info = detectProject(testDir);

            expect(info.hasDocker).toBe(true);
        });

        it('should detect GitHub Actions', () => {
            mkdirSync(join(testDir, '.github', 'workflows'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasCI).toBe(true);
            expect(info.stacks.some(s => s.name === 'CI/CD')).toBe(true);
        });

        it('should detect GitLab CI', () => {
            writeFileSync(join(testDir, '.gitlab-ci.yml'), 'stages: [build]');

            const info = detectProject(testDir);

            expect(info.hasCI).toBe(true);
        });

        it('should detect Cursor IDE', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });

            const info = detectProject(testDir);

            expect(info.hasCursor).toBe(true);
        });
    });

    describe('detectProject - Stacks Array', () => {
        it('should populate stacks with correct structure', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, '.env'), 'KEY=value');

            const info = detectProject(testDir);

            expect(info.stacks.length).toBeGreaterThan(0);
            expect(info.stacks[0]).toHaveProperty('name');
            expect(info.stacks[0]).toHaveProperty('type');
            expect(info.stacks[0]).toHaveProperty('ruleCount');
        });

        it('should not duplicate frontend stack when React is detected', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));
            mkdirSync(join(testDir, 'src', 'components'), { recursive: true });

            const info = detectProject(testDir);

            // Should have React stack but not duplicate "Frontend Components"
            const frontendStacks = info.stacks.filter(s => s.name === 'Frontend Components');
            expect(frontendStacks).toHaveLength(0);
        });
    });

    describe('suggestRuleSets', () => {
        it('should always include core', () => {
            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            expect(rules).toContain('core');
        });

        it('should include typescript for TS projects', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');

            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            expect(rules).toContain('typescript');
        });

        it('should include python for Python projects', () => {
            writeFileSync(join(testDir, 'requirements.txt'), 'django');

            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            expect(rules).toContain('python');
        });

        it('should include react for React projects', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));

            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            expect(rules).toContain('react');
        });

        it('should include security for projects with .env files', () => {
            writeFileSync(join(testDir, '.env'), 'SECRET=value');

            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            expect(rules).toContain('security');
        });

        it('should not have duplicates', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));

            const info = detectProject(testDir);
            const rules = suggestRuleSets(info);

            const uniqueRules = [...new Set(rules)];
            expect(rules.length).toBe(uniqueRules.length);
        });
    });

    describe('generateStackSummary', () => {
        it('should return formatted summary string', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, '.env'), 'KEY=value');
            mkdirSync(join(testDir, 'tests'), { recursive: true });

            const info = detectProject(testDir);
            const summary = generateStackSummary(info);

            expect(summary).toMatch(/Found \d+ stacks\. Syncing \d+ relevant nevers\./);
        });

        it('should count stacks correctly', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, '.env'), 'KEY=value');

            const info = detectProject(testDir);
            const summary = generateStackSummary(info);

            // TypeScript + Environment Config = 2 stacks
            expect(summary).toContain('Found 2 stacks');
        });

        it('should calculate total rules', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');

            const info = detectProject(testDir);
            const summary = generateStackSummary(info);

            // TypeScript has 15 rules in our config
            expect(summary).toContain('15 relevant nevers');
        });
    });
});
