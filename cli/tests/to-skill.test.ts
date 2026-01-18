/**
 * Tests for to-skill engine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateSkillContent, generateSkillFile } from '../src/engines/to-skill.js';
import type { ParsedRule } from '../src/engines/parser.js';

describe('to-skill', () => {
    const mockRules: ParsedRule[] = [
        {
            id: 'core/safety',
            filename: 'safety.md',
            frontmatter: {
                name: 'Safety & Security',
                description: 'Core safety rules',
                tags: ['security'],
                globs: '**/*',
                alwaysApply: true,
            },
            content: '- Never use eval()\n- Never hardcode secrets',
            rules: ['Never use eval()', 'Never hardcode secrets'],
        },
        {
            id: 'typescript/types',
            filename: 'types.md',
            frontmatter: {
                name: 'TypeScript Types',
                description: 'Type safety rules',
                tags: ['typescript'],
                globs: '**/*.ts',
                alwaysApply: false,
            },
            content: '- Never use any type\n- Never use type assertions',
            rules: ['Never use any type', 'Never use type assertions'],
        },
    ];

    describe('generateSkillContent', () => {
        it('should generate valid SKILL.md content', () => {
            const content = generateSkillContent(mockRules);

            expect(content).toContain('name: Never Guardian');
            expect(content).toContain('description: Validates code against Never constraints');
        });

        it('should include tool definitions', () => {
            const content = generateSkillContent(mockRules);

            expect(content).toContain('check_constraints');
            expect(content).toContain('get_relevant_rules');
        });

        it('should count total rules correctly', () => {
            const content = generateSkillContent(mockRules);

            // 2 rules from Safety + 2 rules from TypeScript = 4 total
            expect(content).toContain('4 constraints');
        });

        it('should list categories with counts', () => {
            const content = generateSkillContent(mockRules);

            expect(content).toContain('Safety & Security: 2 constraints');
            expect(content).toContain('TypeScript Types: 2 constraints');
        });

        it('should include key constraint areas', () => {
            const content = generateSkillContent(mockRules);

            expect(content).toContain('Security');
            expect(content).toContain('Code Quality');
        });
    });

    describe('generateSkillFile', () => {
        let testDir: string;

        beforeEach(() => {
            testDir = join(tmpdir(), `never-skill-test-${Date.now()}`);
            mkdirSync(testDir, { recursive: true });
        });

        afterEach(() => {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
        });

        it('should create .claude/skills/never-guardian/ directory', () => {
            generateSkillFile(testDir, mockRules, false);

            const skillDir = join(testDir, '.claude', 'skills', 'never-guardian');
            expect(existsSync(skillDir)).toBe(true);
        });

        it('should create SKILL.md file', () => {
            generateSkillFile(testDir, mockRules, false);

            const skillPath = join(testDir, '.claude', 'skills', 'never-guardian', 'SKILL.md');
            expect(existsSync(skillPath)).toBe(true);
        });

        it('should write correct content to SKILL.md', () => {
            generateSkillFile(testDir, mockRules, false);

            const skillPath = join(testDir, '.claude', 'skills', 'never-guardian', 'SKILL.md');
            const content = readFileSync(skillPath, 'utf-8');

            expect(content).toContain('Never Guardian');
            expect(content).toContain('check_constraints');
        });

        it('should return correct result object', () => {
            const result = generateSkillFile(testDir, mockRules, false);

            expect(result.path).toContain('SKILL.md');
            expect(result.content).toContain('Never Guardian');
            expect(result.written).toBe(true);
        });

        it('should not write file in dry-run mode', () => {
            const result = generateSkillFile(testDir, mockRules, true);

            const skillPath = join(testDir, '.claude', 'skills', 'never-guardian', 'SKILL.md');
            expect(existsSync(skillPath)).toBe(false);
            expect(result.written).toBe(false);
            expect(result.content).toContain('Never Guardian');
        });
    });
});
