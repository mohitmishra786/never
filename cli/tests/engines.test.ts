/**
 * Unit tests for sync engines
 */

import { describe, it, expect } from 'vitest';
import { ruleToMdc, createCombinedMdc } from '../src/engines/to-mdc.js';
import { generateClaudeContent } from '../src/engines/to-claude.js';
import { generateAgentsContent } from '../src/engines/to-agents.js';
import type { ParsedRule } from '../src/engines/parser.js';

const mockRule: ParsedRule = {
    id: 'core/test',
    filename: 'test.md',
    frontmatter: {
        name: 'Test Rules',
        description: 'Rules for testing',
        tags: ['test'],
        globs: '**/*.ts',
        alwaysApply: false,
    },
    content: `# Test Rules

## Section One

- Never skip tests
- Never use any

## Section Two

- Never forget coverage
`,
    rules: [
        'Never skip tests',
        'Never use any',
        'Never forget coverage',
    ],
};

describe('to-mdc engine', () => {
    it('generates valid .mdc frontmatter', () => {
        const result = ruleToMdc(mockRule);

        expect(result.filename).toBe('test.mdc');
        expect(result.content).toContain('---');
        expect(result.content).toContain('description: Rules for testing');
        expect(result.content).toContain('globs: **/*.ts');
        expect(result.content).toContain('alwaysApply: false');
    });

    it('preserves markdown content', () => {
        const result = ruleToMdc(mockRule);

        expect(result.content).toContain('# Test Rules');
        expect(result.content).toContain('- Never skip tests');
        expect(result.content).toContain('- Never use any');
    });

    it('creates combined mdc for category', () => {
        const result = createCombinedMdc('combined', [mockRule], 'Combined test rules');

        expect(result.filename).toBe('combined.mdc');
        expect(result.content).toContain('description: Combined test rules');
        expect(result.content).toContain('alwaysApply: true');
    });
});

describe('to-claude engine', () => {
    it('generates content grouped by rule name', () => {
        const content = generateClaudeContent([mockRule]);

        expect(content).toContain('## Test Rules');
        expect(content).toContain('- Never skip tests');
        expect(content).toContain('- Never use any');
        expect(content).toContain('- Never forget coverage');
    });

    it('handles multiple rule sets', () => {
        const secondRule: ParsedRule = {
            ...mockRule,
            id: 'core/security',
            frontmatter: { ...mockRule.frontmatter, name: 'Security' },
            rules: ['Never expose secrets'],
        };

        const content = generateClaudeContent([mockRule, secondRule]);

        expect(content).toContain('## Test Rules');
        expect(content).toContain('## Security');
        expect(content).toContain('- Never expose secrets');
    });
});

describe('to-agents engine', () => {
    it('generates content with descriptions', () => {
        const content = generateAgentsContent([mockRule]);

        expect(content).toContain('### Test Rules');
        expect(content).toContain('> Rules for testing');
        expect(content).toContain('- Never skip tests');
    });

    it('formats multiple rules correctly', () => {
        const content = generateAgentsContent([mockRule]);

        const lines = content.split('\n').filter(l => l.startsWith('- Never'));
        expect(lines).toHaveLength(3);
    });
});
