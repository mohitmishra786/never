/**
 * Markdown rule parser
 * Parses "Never" rule files with YAML frontmatter
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

export interface RuleFrontmatter {
    name: string;
    description: string;
    tags: string[];
    globs: string;
    alwaysApply: boolean;
}

export interface ParsedRule {
    id: string;           // e.g., "core/safety"
    filename: string;     // e.g., "safety.md"
    frontmatter: RuleFrontmatter;
    content: string;      // Markdown content without frontmatter
    rules: string[];      // Individual "Never" rules extracted
}

export interface RuleSet {
    name: string;         // e.g., "core", "typescript", "react"
    rules: ParsedRule[];
}

const DEFAULT_FRONTMATTER: RuleFrontmatter = {
    name: 'Unnamed Rule',
    description: 'No description provided',
    tags: [],
    globs: '**/*',
    alwaysApply: true,
};

/**
 * Parse a single markdown rule file
 */
export function parseRuleFile(filePath: string, ruleSetName: string): ParsedRule | null {
    if (!existsSync(filePath)) {
        return null;
    }

    try {
        const content = readFileSync(filePath, 'utf-8');
        const { data, content: markdownContent } = matter(content);

        const frontmatter: RuleFrontmatter = {
            ...DEFAULT_FRONTMATTER,
            ...data,
        };

        // Extract individual "Never" rules from the content
        const rules = extractNeverRules(markdownContent);

        const filename = basename(filePath);
        const id = `${ruleSetName}/${filename.replace('.md', '')}`;

        return {
            id,
            filename,
            frontmatter,
            content: markdownContent,
            rules,
        };
    } catch (error) {
        console.error(`Failed to parse rule file ${filePath}:`, error);
        return null;
    }
}

/**
 * Extract individual "Never" rules from markdown content
 */
export function extractNeverRules(content: string): string[] {
    const rules: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Match lines starting with "- Never" or "* Never"
        if (trimmed.match(/^[-*]\s+Never\s+/i)) {
            // Extract the rule text, removing the bullet and "Never"
            const ruleText = trimmed.replace(/^[-*]\s+/, '').trim();
            rules.push(ruleText);
        }
    }

    return rules;
}

/**
 * Load all rules from a directory (e.g., "core", "languages", "web")
 */
export function loadRulesFromDirectory(dirPath: string): ParsedRule[] {
    if (!existsSync(dirPath)) {
        return [];
    }

    const rules: ParsedRule[] = [];
    const entries = readdirSync(dirPath);
    const ruleSetName = basename(dirPath);

    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isFile() && entry.endsWith('.md')) {
            const parsed = parseRuleFile(fullPath, ruleSetName);
            if (parsed) {
                rules.push(parsed);
            }
        } else if (stat.isDirectory()) {
            // Recursively load subdirectories
            const subRules = loadRulesFromDirectory(fullPath);
            rules.push(...subRules);
        }
    }

    return rules;
}

/**
 * Load all rule sets from the library
 */
export function loadAllRuleSets(libraryPath: string): Map<string, RuleSet> {
    const ruleSets = new Map<string, RuleSet>();

    if (!existsSync(libraryPath)) {
        console.error(`Library path does not exist: ${libraryPath}`);
        return ruleSets;
    }

    const categories = readdirSync(libraryPath);

    for (const category of categories) {
        const categoryPath = join(libraryPath, category);
        const stat = statSync(categoryPath);

        if (stat.isDirectory()) {
            const rules = loadRulesFromDirectory(categoryPath);

            if (rules.length > 0) {
                // Map category names to rule set names
                // e.g., "core" -> all files in core/
                // e.g., "languages/typescript.md" -> "typescript"
                for (const rule of rules) {
                    const setName = category === 'core' ? 'core' : rule.filename.replace('.md', '');

                    if (!ruleSets.has(setName)) {
                        ruleSets.set(setName, { name: setName, rules: [] });
                    }

                    ruleSets.get(setName)!.rules.push(rule);
                }
            }
        }
    }

    return ruleSets;
}

/**
 * Get rules for specific rule set names
 */
export function getRulesForSets(
    ruleSets: Map<string, RuleSet>,
    setNames: string[]
): ParsedRule[] {
    const result: ParsedRule[] = [];

    for (const name of setNames) {
        if (name === 'core') {
            // "core" includes all rules from the core directory
            const coreSet = ruleSets.get('core');
            if (coreSet) {
                result.push(...coreSet.rules);
            }
        } else {
            const ruleSet = ruleSets.get(name);
            if (ruleSet) {
                result.push(...ruleSet.rules);
            }
        }
    }

    return result;
}
