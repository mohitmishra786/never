/**
 * get_relevant_constraints tool implementation
 * Returns Never constraints applicable to the files being edited
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minimatch } from 'minimatch';
import matter from 'gray-matter';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RuleFrontmatter {
    name: string;
    description: string;
    tags: string[];
    globs: string;
    alwaysApply: boolean;
}

interface ParsedRule {
    id: string;
    filename: string;
    frontmatter: RuleFrontmatter;
    content: string;
    rules: string[];
}

const DEFAULT_FRONTMATTER: RuleFrontmatter = {
    name: 'Unnamed Rule',
    description: 'No description provided',
    tags: [],
    globs: '**/*',
    alwaysApply: true,
};

/**
 * Find the library path relative to where the server is running
 */
function findLibraryPath(projectPath: string): string | null {
    const possiblePaths = [
        join(projectPath, 'library'),
        join(projectPath, 'node_modules', 'never-cli', 'library'),
        join(dirname(dirname(__dirname)), 'library'), // Relative to mcp/dist
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    return null;
}

/**
 * Parse a rule file and extract rules
 */
function parseRuleFile(filePath: string, ruleSetName: string): ParsedRule | null {
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

        // Extract "Never" rules
        const rules: string[] = [];
        const lines = markdownContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^[-*]\s+Never\s+/i)) {
                rules.push(trimmed.replace(/^[-*]\s+/, '').trim());
            }
        }

        const filename = basename(filePath);
        const id = `${ruleSetName}/${filename.replace('.md', '')}`;

        return {
            id,
            filename,
            frontmatter,
            content: markdownContent,
            rules,
        };
    } catch {
        return null;
    }
}

/**
 * Load all rules from the library
 */
function loadAllRules(libraryPath: string): ParsedRule[] {
    const rules: ParsedRule[] = [];

    function walkDirectory(dirPath: string): void {
        const entries = readdirSync(dirPath);
        const dirName = basename(dirPath);

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isFile() && entry.endsWith('.md')) {
                const parsed = parseRuleFile(fullPath, dirName);
                if (parsed) {
                    rules.push(parsed);
                }
            } else if (stat.isDirectory()) {
                walkDirectory(fullPath);
            }
        }
    }

    walkDirectory(libraryPath);
    return rules;
}

/**
 * Check if a rule applies to a given file path
 */
function ruleAppliesToFile(rule: ParsedRule, filePath: string): boolean {
    if (rule.frontmatter.alwaysApply) {
        return true;
    }

    const globs = rule.frontmatter.globs;
    if (!globs || globs === '**/*') {
        return true;
    }

    const patterns = globs.split(',').map(g => g.trim());
    return patterns.some(pattern => minimatch(filePath, pattern));
}

/**
 * Format rules as markdown for the AI
 */
function formatRulesAsMarkdown(rules: ParsedRule[]): string {
    if (rules.length === 0) {
        return 'No specific constraints apply to the current files.';
    }

    const sections: string[] = [];
    sections.push('# Applicable Never Constraints\n');
    sections.push('The following constraints apply to the files you are editing:\n');

    // Group by rule name
    const grouped = new Map<string, ParsedRule[]>();
    for (const rule of rules) {
        const name = rule.frontmatter.name;
        if (!grouped.has(name)) {
            grouped.set(name, []);
        }
        grouped.get(name)!.push(rule);
    }

    for (const [name, groupRules] of grouped) {
        sections.push(`## ${name}\n`);
        for (const rule of groupRules) {
            for (const neverRule of rule.rules) {
                sections.push(`- ${neverRule}`);
            }
        }
        sections.push('');
    }

    return sections.join('\n');
}

/**
 * Main tool implementation
 */
export async function getRelevantConstraints(
    files: string[],
    projectPath: string
): Promise<string> {
    const libraryPath = findLibraryPath(projectPath);

    if (!libraryPath) {
        return 'Never library not found in the project.';
    }

    const allRules = loadAllRules(libraryPath);

    if (allRules.length === 0) {
        return 'No rules found in the Never library.';
    }

    // Filter rules based on file patterns
    const relevantRules = new Set<ParsedRule>();

    for (const file of files) {
        for (const rule of allRules) {
            if (ruleAppliesToFile(rule, file)) {
                relevantRules.add(rule);
            }
        }
    }

    return formatRulesAsMarkdown([...relevantRules]);
}
