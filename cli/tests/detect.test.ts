/**
 * Unit tests for project detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectProject, suggestRuleSets } from '../src/utils/detect.js';

// Use cross-platform temp directory
const testDir = join(tmpdir(), 'never-detect-test');

describe('detectProject', () => {
    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    it('detects TypeScript project', () => {
        writeFileSync(join(testDir, 'tsconfig.json'), '{}');

        const info = detectProject(testDir);

        expect(info.hasTypeScript).toBe(true);
        expect(info.frameworks).toContain('typescript');
    });

    it('detects Python project from pyproject.toml', () => {
        writeFileSync(join(testDir, 'pyproject.toml'), '[project]\nname = "test"');

        const info = detectProject(testDir);

        expect(info.hasPython).toBe(true);
        expect(info.frameworks).toContain('python');
    });

    it('detects Python project from requirements.txt', () => {
        writeFileSync(join(testDir, 'requirements.txt'), 'flask==2.0.0');

        const info = detectProject(testDir);

        expect(info.hasPython).toBe(true);
    });

    it('detects React from package.json dependencies', () => {
        const packageJson = {
            dependencies: {
                react: '^18.0.0',
            },
        };
        writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

        const info = detectProject(testDir);

        expect(info.hasReact).toBe(true);
        expect(info.frameworks).toContain('react');
    });

    it('detects Next.js as React', () => {
        const packageJson = {
            dependencies: {
                next: '^14.0.0',
            },
        };
        writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

        const info = detectProject(testDir);

        expect(info.hasReact).toBe(true);
    });

    it('detects Vue project', () => {
        const packageJson = {
            dependencies: {
                vue: '^3.0.0',
            },
        };
        writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

        const info = detectProject(testDir);

        expect(info.hasVue).toBe(true);
        expect(info.frameworks).toContain('vue');
    });

    it('detects Cursor directory', () => {
        mkdirSync(join(testDir, '.cursor'));

        const info = detectProject(testDir);

        expect(info.hasCursor).toBe(true);
    });

    it('returns empty frameworks for empty project', () => {
        const info = detectProject(testDir);

        expect(info.frameworks).toHaveLength(0);
        expect(info.hasTypeScript).toBe(false);
        expect(info.hasPython).toBe(false);
    });

    it('detects multiple frameworks', () => {
        writeFileSync(join(testDir, 'tsconfig.json'), '{}');
        const packageJson = {
            dependencies: {
                react: '^18.0.0',
            },
        };
        writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson));

        const info = detectProject(testDir);

        expect(info.hasTypeScript).toBe(true);
        expect(info.hasReact).toBe(true);
        expect(info.frameworks).toContain('typescript');
        expect(info.frameworks).toContain('react');
    });
});

describe('suggestRuleSets', () => {
    it('always includes core', () => {
        const info = detectProject('/nonexistent');
        const rules = suggestRuleSets(info);

        expect(rules).toContain('core');
    });

    it('suggests typescript for TS projects', () => {
        const info = {
            hasTypeScript: true,
            hasPython: false,
            hasReact: false,
            hasVue: false,
            hasAngular: false,
            hasNode: false,
            hasCursor: false,
            frameworks: ['typescript'],
        };

        const rules = suggestRuleSets(info);

        expect(rules).toContain('typescript');
    });

    it('suggests react for React projects', () => {
        const info = {
            hasTypeScript: false,
            hasPython: false,
            hasReact: true,
            hasVue: false,
            hasAngular: false,
            hasNode: true,
            hasCursor: false,
            frameworks: ['react'],
        };

        const rules = suggestRuleSets(info);

        expect(rules).toContain('react');
    });

    it('suggests multiple rule sets for multi-framework projects', () => {
        const info = {
            hasTypeScript: true,
            hasPython: false,
            hasReact: true,
            hasVue: false,
            hasAngular: false,
            hasNode: true,
            hasCursor: false,
            frameworks: ['typescript', 'react'],
        };

        const rules = suggestRuleSets(info);

        expect(rules).toContain('core');
        expect(rules).toContain('typescript');
        expect(rules).toContain('react');
    });
});
