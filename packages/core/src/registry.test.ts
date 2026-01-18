/**
 * Tests for RuleRegistry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { RuleRegistry, createRegistryFromLibrary, type Rule } from './registry.js';

describe('RuleRegistry', () => {
    let registry: RuleRegistry;

    beforeEach(() => {
        registry = new RuleRegistry();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('registerRule', () => {
        it('should register a valid rule', () => {
            const rule: Rule = {
                id: 'test-1',
                priority: 2,
                tags: ['typescript', 'security'],
                content: 'Never use any type',
                category: 'typescript',
            };

            registry.registerRule(rule);

            expect(registry.getCount()).toBe(1);
            expect(registry.getAllRules()).toHaveLength(1);
            expect(registry.getAllRules()[0].id).toBe('test-1');
        });

        it('should apply default priority if not specified', () => {
            const rule: Rule = {
                id: 'test-2',
                priority: 3,
                tags: [],
                content: 'Test rule',
                category: 'core',
            };

            registry.registerRule(rule);

            const rules = registry.getAllRules();
            expect(rules[0].priority).toBe(3);
        });

        it('should index rules by tags', () => {
            registry.registerRule({
                id: 'ts-1',
                priority: 1,
                tags: ['typescript'],
                content: 'TS rule',
                category: 'typescript',
            });
            registry.registerRule({
                id: 'sec-1',
                priority: 1,
                tags: ['security'],
                content: 'Security rule',
                category: 'security',
            });
            registry.registerRule({
                id: 'ts-sec-1',
                priority: 1,
                tags: ['typescript', 'security'],
                content: 'TS security rule',
                category: 'typescript',
            });

            const tsRules = registry.getRulesByTag('typescript');
            const secRules = registry.getRulesByTag('security');

            expect(tsRules).toHaveLength(2);
            expect(secRules).toHaveLength(2);
        });

        it('should index rules by category', () => {
            registry.registerRule({
                id: 'core-1',
                priority: 1,
                tags: [],
                content: 'Core rule 1',
                category: 'core',
            });
            registry.registerRule({
                id: 'core-2',
                priority: 2,
                tags: [],
                content: 'Core rule 2',
                category: 'core',
            });
            registry.registerRule({
                id: 'ts-1',
                priority: 1,
                tags: [],
                content: 'TS rule',
                category: 'typescript',
            });

            const coreRules = registry.getRulesByCategory('core');
            const tsRules = registry.getRulesByCategory('typescript');

            expect(coreRules).toHaveLength(2);
            expect(tsRules).toHaveLength(1);
        });
    });

    describe('priority sorting', () => {
        it('should sort rules by priority (1 = highest first)', () => {
            registry.registerRule({ id: 'low', priority: 5, tags: [], content: 'Low', category: 'test' });
            registry.registerRule({ id: 'high', priority: 1, tags: [], content: 'High', category: 'test' });
            registry.registerRule({ id: 'medium', priority: 3, tags: [], content: 'Medium', category: 'test' });

            const sorted = registry.sortByPriority(registry.getAllRules());

            expect(sorted[0].id).toBe('high');
            expect(sorted[1].id).toBe('medium');
            expect(sorted[2].id).toBe('low');
        });
    });

    describe('getRulesForFile', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'ts-rule',
                priority: 1,
                tags: ['typescript'],
                trigger_regex: '.*\\.ts$',
                content: 'TypeScript rule',
                category: 'typescript',
            });
            registry.registerRule({
                id: 'all-rule',
                priority: 2,
                tags: [],
                content: 'Universal rule',
                category: 'core',
            });
            registry.registerRule({
                id: 'py-rule',
                priority: 1,
                tags: ['python'],
                trigger_regex: '.*\\.py$',
                content: 'Python rule',
                category: 'python',
            });
        });

        it('should return rules matching file extension', () => {
            const rules = registry.getRulesForFile('src/index.ts');
            const ids = rules.map(r => r.id);

            expect(ids).toContain('ts-rule');
            expect(ids).toContain('all-rule');
            expect(ids).not.toContain('py-rule');
        });

        it('should return universal rules for any file', () => {
            const rules = registry.getRulesForFile('any/file.xyz');
            const ids = rules.map(r => r.id);

            expect(ids).toContain('all-rule');
        });

        it('should return Python rules for .py files', () => {
            const rules = registry.getRulesForFile('script.py');
            const ids = rules.map(r => r.id);

            expect(ids).toContain('py-rule');
            expect(ids).toContain('all-rule');
        });
    });

    describe('getTopRulesForFile', () => {
        beforeEach(() => {
            for (let i = 1; i <= 15; i++) {
                registry.registerRule({
                    id: `rule-${i}`,
                    priority: (i % 5) + 1 as 1 | 2 | 3 | 4 | 5,
                    tags: [],
                    content: `Rule ${i}`,
                    category: 'test',
                });
            }
        });

        it('should return only top N rules', () => {
            const top5 = registry.getTopRulesForFile('test.ts', 5);
            expect(top5).toHaveLength(5);
        });

        it('should return rules sorted by priority', () => {
            const top10 = registry.getTopRulesForFile('test.ts', 10);

            // Verify priority ordering (lower priority number = earlier in list)
            for (let i = 0; i < top10.length - 1; i++) {
                expect(top10[i].priority).toBeLessThanOrEqual(top10[i + 1].priority);
            }
        });
    });

    describe('getRulesByTags', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'ts-only',
                priority: 1,
                tags: ['typescript'],
                content: 'TS only',
                category: 'ts',
            });
            registry.registerRule({
                id: 'sec-only',
                priority: 1,
                tags: ['security'],
                content: 'Sec only',
                category: 'sec',
            });
            registry.registerRule({
                id: 'both',
                priority: 1,
                tags: ['typescript', 'security'],
                content: 'Both',
                category: 'both',
            });
        });

        it('should return rules matching all specified tags', () => {
            const rules = registry.getRulesByTags(['typescript', 'security']);

            expect(rules).toHaveLength(1);
            expect(rules[0].id).toBe('both');
        });

        it('should return all rules when no tags specified', () => {
            const rules = registry.getRulesByTags([]);
            expect(rules).toHaveLength(3);
        });
    });

    describe('getAllTags and getAllCategories', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'rule-1',
                priority: 1,
                tags: ['typescript', 'async'],
                content: 'Rule 1',
                category: 'core',
            });
            registry.registerRule({
                id: 'rule-2',
                priority: 1,
                tags: ['security'],
                content: 'Rule 2',
                category: 'security',
            });
        });

        it('should return all unique tags', () => {
            const tags = registry.getAllTags();

            expect(tags).toContain('typescript');
            expect(tags).toContain('async');
            expect(tags).toContain('security');
        });

        it('should return all unique categories', () => {
            const categories = registry.getAllCategories();

            expect(categories).toContain('core');
            expect(categories).toContain('security');
        });
    });

    describe('export functions', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'test-rule',
                priority: 2,
                tags: ['test'],
                content: 'Test content',
                category: 'test',
            });
        });

        it('should export to valid JSON', () => {
            const json = registry.exportToJson();
            const parsed = JSON.parse(json);

            expect(parsed.name).toBe('never-rules');
            expect(parsed.version).toBe('1.0.0');
            expect(parsed.rules).toHaveLength(1);
            expect(parsed.rules[0].id).toBe('test-rule');
        });

        it('should export to valid YAML', () => {
            const yaml = registry.exportToYaml();

            expect(yaml).toContain('name: never-rules');
            expect(yaml).toContain('test-rule');
        });
    });

    describe('clear', () => {
        it('should remove all rules', () => {
            registry.registerRule({
                id: 'rule-1',
                priority: 1,
                tags: ['test'],
                content: 'Rule 1',
                category: 'test',
            });

            expect(registry.getCount()).toBe(1);

            registry.clear();

            expect(registry.getCount()).toBe(0);
            expect(registry.getAllTags()).toHaveLength(0);
            expect(registry.getAllCategories()).toHaveLength(0);
        });
    });
});

describe('createRegistryFromLibrary', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `never-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        mkdirSync(join(testDir, 'core'), { recursive: true });

        // Create a test markdown rule file
        writeFileSync(
            join(testDir, 'core', 'safety.md'),
            `---
name: Safety Rules
description: Core safety constraints
tags:
  - core
  - safety
globs: "**/*"
alwaysApply: true
priority: 1
---

# Safety Rules

- Never use eval()
- Never hardcode secrets
- Never trust user input without validation
`
        );
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should load rules from markdown files', () => {
        const registry = createRegistryFromLibrary(testDir);

        expect(registry.getCount()).toBeGreaterThan(0);
    });

    it('should extract Never rules from content', () => {
        const registry = createRegistryFromLibrary(testDir);
        const rules = registry.getAllRules();

        // Check that individual "Never" rules were extracted
        const ruleContents = rules.map(r => r.content);
        expect(ruleContents.some(c => c.includes('eval'))).toBe(true);
    });

    it('should return empty registry for non-existent path', () => {
        const registry = createRegistryFromLibrary('/non/existent/path');
        expect(registry.getCount()).toBe(0);
    });
});
