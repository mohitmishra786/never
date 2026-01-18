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
 * Locate the Never constraints library directory for a given project.
 *
 * Checks a set of plausible locations (project/library, node_modules/never-cli/library, and a library path relative to the current module) and returns the first existing path.
 *
 * @param projectPath - Absolute or relative path to the project's root directory
 * @returns The filesystem path to the library if found, `null` otherwise
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
 * Parse a markdown rule file and produce a structured rule object containing its metadata and extracted "Never" constraints.
 *
 * @param filePath - Filesystem path to the markdown rule file
 * @param ruleSetName - Namespace used to construct the rule `id` (prefixed to the filename without extension)
 * @returns A `ParsedRule` containing `id`, `filename`, `frontmatter`, `content`, and an array of extracted `Never` rules, or `null` if the file does not exist or cannot be parsed
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
 * Recursively loads all markdown rule files under the given library directory and returns their parsed representations.
 *
 * @param libraryPath - Filesystem path to the root of the rule library
 * @returns An array of ParsedRule objects for each `.md` rule file discovered under `libraryPath`
 */
function loadAllRules(libraryPath: string): ParsedRule[] {
    const rules: ParsedRule[] = [];

    /**
     * Recursively traverses the given directory and appends parsed Markdown rule files to the module-level `rules` collection.
     *
     * @param dirPath - Path of the directory to walk. Any `.md` files found will be parsed into rule objects and added to `rules`; subdirectories are traversed recursively.
     */
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
 * Determine whether a parsed rule should apply to a specific file path.
 *
 * @param rule - The parsed rule whose `frontmatter.alwaysApply` and `frontmatter.globs` determine applicability.
 * @param filePath - The file path to test against the rule's glob patterns (used with `minimatch`).
 * @returns `true` if the rule applies to the file, `false` otherwise.
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
 * Render applicable parsed rules into a Markdown document that lists each rule set and its "Never" constraints.
 *
 * @param rules - ParsedRule objects to include, each providing a frontmatter.name and extracted Never constraint lines
 * @returns A Markdown string with a top-level heading and sections per rule name; if `rules` is empty, returns a short message indicating no constraints apply.
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
 * Produce a Markdown report of Never constraints applicable to the given files within a project.
 *
 * @param files - File paths to evaluate against the Never rules; paths are matched against each rule's globs.
 * @param projectPath - Root path of the project used to locate the Never library.
 * @returns A Markdown-formatted string listing applicable Never constraints grouped by rule name, or a human-readable message if the Never library is not found or contains no rules. 
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