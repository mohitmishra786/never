/**
 * get_applicable_constraints tool implementation
 * Returns the top 10 most relevant Never constraints based on file extension and content
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
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
    priority?: number;
}

interface ParsedRule {
    id: string;
    filename: string;
    frontmatter: RuleFrontmatter;
    content: string;
    rules: string[];
    priority: number;
}

interface ScoredRule {
    rule: ParsedRule;
    ruleText: string;
    score: number;
}

const DEFAULT_FRONTMATTER: RuleFrontmatter = {
    name: 'Unnamed Rule',
    description: 'No description provided',
    tags: [],
    globs: '**/*',
    alwaysApply: true,
    priority: 3,
};

/**
 * Extension to tag mapping for relevance scoring
 */
const EXTENSION_TAGS: Record<string, string[]> = {
    '.ts': ['typescript', 'javascript', 'node'],
    '.tsx': ['typescript', 'react', 'frontend'],
    '.js': ['javascript', 'node'],
    '.jsx': ['javascript', 'react', 'frontend'],
    '.py': ['python'],
    '.rs': ['rust'],
    '.go': ['go'],
    '.java': ['java'],
    '.vue': ['vue', 'frontend'],
    '.svelte': ['svelte', 'frontend'],
    '.css': ['css', 'frontend'],
    '.scss': ['css', 'sass', 'frontend'],
    '.html': ['html', 'frontend'],
    '.json': ['json', 'config'],
    '.yaml': ['yaml', 'config'],
    '.yml': ['yaml', 'config'],
    '.md': ['markdown', 'docs'],
    '.sql': ['sql', 'database'],
    '.sh': ['shell', 'bash'],
    '.dockerfile': ['docker'],
    '.env': ['security', 'config'],
};

/**
 * Content patterns for relevance scoring
 */
const CONTENT_PATTERNS: Array<{ pattern: RegExp; tags: string[] }> = [
    { pattern: /useState|useEffect|useCallback/i, tags: ['react', 'hooks'] },
    { pattern: /async|await|Promise/i, tags: ['async'] },
    { pattern: /class\s+\w+/i, tags: ['oop'] },
    { pattern: /import.*from/i, tags: ['modules'] },
    { pattern: /SELECT|INSERT|UPDATE|DELETE/i, tags: ['sql', 'database'] },
    { pattern: /\.env|process\.env|API_KEY|SECRET/i, tags: ['security', 'secrets'] },
    { pattern: /test\(|describe\(|it\(|expect\(/i, tags: ['testing'] },
    { pattern: /console\.(log|error|warn)/i, tags: ['debugging'] },
];

/**
 * Find the library path relative to where the server is running
 */
function findLibraryPath(projectPath: string): string | null {
    const possiblePaths = [
        join(projectPath, 'library'),
        join(projectPath, 'node_modules', 'never-cli', 'library'),
        join(dirname(dirname(__dirname)), 'library'),
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
            priority: frontmatter.priority || 3,
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
 * Calculate relevance score for a rule based on file path and content
 */
function calculateScore(
    rule: ParsedRule,
    filePath: string,
    fileContent?: string
): number {
    let score = 0;
    const ext = extname(filePath).toLowerCase();
    const extensionTags = EXTENSION_TAGS[ext] || [];
    const ruleTags = rule.frontmatter.tags || [];

    // Base priority score (1 = highest priority = highest score)
    score += (6 - rule.priority) * 10;

    // alwaysApply rules get a boost
    if (rule.frontmatter.alwaysApply) {
        score += 5;
    }

    // Extension-based matching
    for (const tag of extensionTags) {
        if (ruleTags.includes(tag)) {
            score += 15;
        }
    }

    // Glob pattern matching
    if (rule.frontmatter.globs) {
        const patterns = rule.frontmatter.globs.split(',').map(g => g.trim());
        for (const pattern of patterns) {
            if (minimatch(filePath, pattern)) {
                score += 20;
                break;
            }
        }
    }

    // Content-based scoring (if content provided)
    if (fileContent) {
        for (const { pattern, tags } of CONTENT_PATTERNS) {
            if (pattern.test(fileContent)) {
                for (const tag of tags) {
                    if (ruleTags.includes(tag)) {
                        score += 10;
                    }
                }
            }
        }
    }

    // Security rules always relevant for .env files
    if (ext === '.env' && ruleTags.includes('security')) {
        score += 30;
    }

    return score;
}

/**
 * Get top 10 most relevant rules for a file
 */
function getTopRulesForFile(
    allRules: ParsedRule[],
    filePath: string,
    fileContent?: string,
    limit: number = 10
): ScoredRule[] {
    const scoredRules: ScoredRule[] = [];

    for (const rule of allRules) {
        const score = calculateScore(rule, filePath, fileContent);

        // Expand individual rules from the rule file
        for (const ruleText of rule.rules) {
            scoredRules.push({
                rule,
                ruleText,
                score,
            });
        }
    }

    // Sort by score (descending) and take top N
    return scoredRules
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Format rules as markdown for the AI
 */
function formatRulesAsMarkdown(scoredRules: ScoredRule[]): string {
    if (scoredRules.length === 0) {
        return 'No specific constraints apply to the current files.';
    }

    const sections: string[] = [];
    sections.push('# Top 10 Applicable Never Constraints\n');
    sections.push('The following constraints are most relevant to the files you are editing:\n');

    // Group by category
    const grouped = new Map<string, ScoredRule[]>();
    for (const sr of scoredRules) {
        const name = sr.rule.frontmatter.name;
        if (!grouped.has(name)) {
            grouped.set(name, []);
        }
        grouped.get(name)!.push(sr);
    }

    for (const [name, rules] of grouped) {
        sections.push(`## ${name}\n`);
        for (const sr of rules) {
            sections.push(`- ${sr.ruleText}`);
        }
        sections.push('');
    }

    return sections.join('\n');
}

/**
 * Main tool implementation - get_applicable_constraints
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

    // For single file, we can potentially read its content
    let fileContent: string | undefined;
    if (files.length === 1 && existsSync(files[0])) {
        try {
            fileContent = readFileSync(files[0], 'utf-8');
        } catch {
            // Ignore read errors
        }
    }

    // Get top 10 rules across all files
    const allScoredRules: ScoredRule[] = [];
    for (const file of files) {
        const topRules = getTopRulesForFile(allRules, file, fileContent, 10);
        allScoredRules.push(...topRules);
    }

    // Deduplicate and sort by score
    const uniqueRules = new Map<string, ScoredRule>();
    for (const sr of allScoredRules) {
        const key = sr.ruleText;
        if (!uniqueRules.has(key) || uniqueRules.get(key)!.score < sr.score) {
            uniqueRules.set(key, sr);
        }
    }

    const finalRules = Array.from(uniqueRules.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    return formatRulesAsMarkdown(finalRules);
}
