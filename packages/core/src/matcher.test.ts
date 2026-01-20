/**
 * Tests for Rule Matching and Merging
 * Verifies that rules from multiple categories are correctly merged and filtered
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleRegistry } from './registry.js';

describe('RuleRegistry Matching and Merging', () => {
    let registry: RuleRegistry;

    beforeEach(() => {
        registry = new RuleRegistry();
    });

    describe('Rule Registration', () => {
        it('should register a single rule correctly', () => {
            registry.registerRule({
                id: 'test/rule-1',
                priority: 2,
                tags: ['typescript', 'testing'],
                content: 'Never use any type',
                category: 'test',
            });

            expect(registry.getCount()).toBe(1);
        });

        it('should overwrite existing rule with same id', () => {
            registry.registerRule({
                id: 'test/rule-1',
                priority: 2,
                tags: ['typescript'],
                content: 'Original content',
                category: 'test',
            });

            registry.registerRule({
                id: 'test/rule-1',
                priority: 3,
                tags: ['typescript'],
                content: 'New content',
                category: 'test',
            });

            expect(registry.getCount()).toBe(1);
            const rules = registry.getAllRules();
            expect(rules[0].content).toBe('New content');
        });

        it('should register multiple rules from different categories', () => {
            registry.registerRule({
                id: 'react/component-naming',
                priority: 2,
                tags: ['react', 'naming'],
                content: 'Never use lowercase for component names',
                category: 'react',
            });

            registry.registerRule({
                id: 'typescript/no-any',
                priority: 1,
                tags: ['typescript', 'types'],
                content: 'Never use any type without justification',
                category: 'typescript',
            });

            expect(registry.getCount()).toBe(2);
            expect(registry.getAllCategories()).toContain('react');
            expect(registry.getAllCategories()).toContain('typescript');
        });
    });

    describe('Rule Merging by Tags', () => {
        beforeEach(() => {
            // Set up rules for React and TypeScript
            registry.registerRule({
                id: 'react/hooks',
                priority: 2,
                tags: ['react', 'hooks'],
                content: 'Always use hooks at the top level',
                category: 'react',
            });

            registry.registerRule({
                id: 'react/memo',
                priority: 3,
                tags: ['react', 'performance'],
                content: 'Use React.memo for expensive components',
                category: 'react',
            });

            registry.registerRule({
                id: 'typescript/strict',
                priority: 1,
                tags: ['typescript', 'strict'],
                content: 'Always enable strict mode',
                category: 'typescript',
            });

            registry.registerRule({
                id: 'typescript/no-any',
                priority: 2,
                tags: ['typescript', 'types'],
                content: 'Never use any type',
                category: 'typescript',
            });
        });

        it('should get rules by single tag', () => {
            const reactRules = registry.getRulesByTag('react');
            expect(reactRules.length).toBe(2);

            const tsRules = registry.getRulesByTag('typescript');
            expect(tsRules.length).toBe(2);
        });

        it('should get rules matching multiple tags (intersection)', () => {
            const reactPerformanceRules = registry.getRulesByTags(['react', 'performance']);
            expect(reactPerformanceRules.length).toBe(1);
            expect(reactPerformanceRules[0].id).toBe('react/memo');
        });

        it('should return empty array when no rules match all tags', () => {
            const noMatchRules = registry.getRulesByTags(['react', 'no-match-tag']);
            expect(noMatchRules.length).toBe(0);
        });

        it('should get all tags from registry', () => {
            const tags = registry.getAllTags();
            expect(tags).toContain('react');
            expect(tags).toContain('typescript');
            expect(tags).toContain('hooks');
            expect(tags).toContain('performance');
            expect(tags).toContain('strict');
            expect(tags).toContain('types');
        });
    });

    describe('Rule Filtering by Category', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'core/safety',
                priority: 1,
                tags: ['core'],
                content: 'Core safety rule',
                category: 'core',
            });

            registry.registerRule({
                id: 'security/secrets',
                priority: 1,
                tags: ['security'],
                content: 'Never hardcode secrets',
                category: 'security',
            });

            registry.registerRule({
                id: 'testing/coverage',
                priority: 3,
                tags: ['testing'],
                content: 'Always test critical paths',
                category: 'testing',
            });
        });

        it('should filter rules by category', () => {
            const coreRules = registry.getRulesByCategory('core');
            expect(coreRules.length).toBe(1);
            expect(coreRules[0].id).toBe('core/safety');

            const securityRules = registry.getRulesByCategory('security');
            expect(securityRules.length).toBe(1);
        });

        it('should return empty array for non-existent category', () => {
            const noRules = registry.getRulesByCategory('nonexistent');
            expect(noRules.length).toBe(0);
        });

        it('should get all categories', () => {
            const categories = registry.getAllCategories();
            expect(categories).toContain('core');
            expect(categories).toContain('security');
            expect(categories).toContain('testing');
        });
    });

    describe('Priority Sorting', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'low/priority',
                priority: 5,
                tags: ['test'],
                content: 'Low priority rule',
                category: 'test',
            });

            registry.registerRule({
                id: 'high/priority',
                priority: 1,
                tags: ['test'],
                content: 'High priority rule',
                category: 'test',
            });

            registry.registerRule({
                id: 'medium/priority',
                priority: 3,
                tags: ['test'],
                content: 'Medium priority rule',
                category: 'test',
            });
        });

        it('should sort rules by priority (1 = highest first)', () => {
            const rules = registry.getAllRules();
            const sorted = registry.sortByPriority(rules);

            expect(sorted[0].priority).toBe(1);
            expect(sorted[1].priority).toBe(3);
            expect(sorted[2].priority).toBe(5);
        });

        it('should get top N rules by priority', () => {
            // All rules match any file path without trigger_regex
            const topRules = registry.getTopRulesForFile('any-file.ts', 2);
            expect(topRules.length).toBe(2);
            expect(topRules[0].priority).toBe(1);
            expect(topRules[1].priority).toBe(3);
        });
    });

    describe('File Path Matching', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'ts/rule',
                priority: 2,
                tags: ['typescript'],
                trigger_regex: '\\.tsx?$',
                content: 'TypeScript rule',
                category: 'typescript',
            });

            registry.registerRule({
                id: 'py/rule',
                priority: 2,
                tags: ['python'],
                trigger_regex: '\\.py$',
                content: 'Python rule',
                category: 'python',
            });

            registry.registerRule({
                id: 'global/rule',
                priority: 1,
                tags: ['global'],
                content: 'Global rule without trigger',
                category: 'global',
            });
        });

        it('should filter rules by file extension', () => {
            const tsRules = registry.getRulesForFile('test.ts');
            const tsRuleIds = tsRules.map(r => r.id);

            expect(tsRuleIds).toContain('ts/rule');
            expect(tsRuleIds).toContain('global/rule');
            expect(tsRuleIds).not.toContain('py/rule');
        });

        it('should match tsx files with ts regex', () => {
            const rules = registry.getRulesForFile('component.tsx');
            const ruleIds = rules.map(r => r.id);

            expect(ruleIds).toContain('ts/rule');
        });

        it('should match python files correctly', () => {
            const pyRules = registry.getRulesForFile('script.py');
            const pyRuleIds = pyRules.map(r => r.id);

            expect(pyRuleIds).toContain('py/rule');
            expect(pyRuleIds).toContain('global/rule');
            expect(pyRuleIds).not.toContain('ts/rule');
        });
    });

    describe('Rule Pack Registration', () => {
        it('should register all rules from a pack', () => {
            const pack = {
                name: 'test-pack',
                version: '1.0.0',
                description: 'Test rule pack',
                rules: [
                    {
                        id: 'pack/rule-1',
                        priority: 2,
                        tags: ['test'],
                        content: 'Rule 1',
                        category: 'test',
                    },
                    {
                        id: 'pack/rule-2',
                        priority: 3,
                        tags: ['test'],
                        content: 'Rule 2',
                        category: 'test',
                    },
                ],
            };

            registry.registerPack(pack);
            expect(registry.getCount()).toBe(2);
        });
    });

    describe('Export Functionality', () => {
        beforeEach(() => {
            registry.registerRule({
                id: 'export/test',
                priority: 2,
                tags: ['export'],
                content: 'Test export rule',
                category: 'export',
            });
        });

        it('should export rules to JSON', () => {
            const json = registry.exportToJson();
            const parsed = JSON.parse(json);

            expect(parsed.rules).toBeDefined();
            expect(parsed.rules.length).toBe(1);
            expect(parsed.rules[0].id).toBe('export/test');
        });

        it('should export rules to YAML', () => {
            const yaml = registry.exportToYaml();

            expect(yaml).toContain('rules:');
            expect(yaml).toContain('export/test');
        });
    });

    describe('Clear Functionality', () => {
        it('should clear all rules', () => {
            registry.registerRule({
                id: 'test/rule',
                priority: 2,
                tags: ['test'],
                content: 'Test rule',
                category: 'test',
            });

            expect(registry.getCount()).toBe(1);

            registry.clear();

            expect(registry.getCount()).toBe(0);
            expect(registry.getAllTags().length).toBe(0);
            expect(registry.getAllCategories().length).toBe(0);
        });
    });
});
