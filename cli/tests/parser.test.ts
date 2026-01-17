/**
 * Unit tests for the rule parser
 */

import { describe, it, expect } from 'vitest';
import {
    extractNeverRules,
    parseRuleFile,
    loadRulesFromDirectory
} from '../src/engines/parser.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const libraryPath = join(__dirname, '..', '..', 'library');

describe('extractNeverRules', () => {
    it('extracts rules starting with "- Never"', () => {
        const content = `
# Test Rules

## Section One

- Never do this thing
- Never do that thing

## Section Two

- Never forget to test
    `;

        const rules = extractNeverRules(content);

        expect(rules).toHaveLength(3);
        expect(rules[0]).toBe('Never do this thing');
        expect(rules[1]).toBe('Never do that thing');
        expect(rules[2]).toBe('Never forget to test');
    });

    it('handles asterisk bullets as well', () => {
        const content = `
* Never use eval
* Never hardcode secrets
    `;

        const rules = extractNeverRules(content);

        expect(rules).toHaveLength(2);
        expect(rules[0]).toBe('Never use eval');
    });

    it('ignores rules that do not start with Never', () => {
        const content = `
- Never do this
- Always do that
- Maybe do something else
- Never forget
    `;

        const rules = extractNeverRules(content);

        expect(rules).toHaveLength(2);
        expect(rules[0]).toBe('Never do this');
        expect(rules[1]).toBe('Never forget');
    });

    it('returns empty array for content with no rules', () => {
        const content = `
# Just a heading

Some paragraph text without any rules.
    `;

        const rules = extractNeverRules(content);

        expect(rules).toHaveLength(0);
    });

    it('handles case insensitive Never', () => {
        const content = `
- NEVER shout
- never whisper
- Never speak
    `;

        const rules = extractNeverRules(content);

        expect(rules).toHaveLength(3);
    });
});

describe('parseRuleFile', () => {
    it('parses safety.md from library', () => {
        const safePath = join(libraryPath, 'core', 'safety.md');
        const result = parseRuleFile(safePath, 'core');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('core/safety');
        expect(result?.frontmatter.name).toBe('Safety & Security');
        expect(result?.frontmatter.globs).toBe('**/*');
        expect(result?.rules.length).toBeGreaterThan(0);
    });

    it('parses typescript.md from library', () => {
        const tsPath = join(libraryPath, 'languages', 'typescript.md');
        const result = parseRuleFile(tsPath, 'languages');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('languages/typescript');
        expect(result?.frontmatter.name).toBe('TypeScript');
        expect(result?.frontmatter.tags).toContain('typescript');
    });

    it('returns null for non-existent file', () => {
        const result = parseRuleFile('/nonexistent/path.md', 'test');

        expect(result).toBeNull();
    });
});

describe('loadRulesFromDirectory', () => {
    it('loads all rules from core directory', () => {
        const corePath = join(libraryPath, 'core');
        const rules = loadRulesFromDirectory(corePath);

        expect(rules.length).toBeGreaterThan(0);

        const filenames = rules.map(r => r.filename);
        expect(filenames).toContain('safety.md');
        expect(filenames).toContain('code.md');
        expect(filenames).toContain('tone.md');
        expect(filenames).toContain('workflow.md');
    });

    it('returns empty array for non-existent directory', () => {
        const rules = loadRulesFromDirectory('/nonexistent/path');

        expect(rules).toHaveLength(0);
    });
});
