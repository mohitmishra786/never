/**
 * Rule Registry - Centralized storage for structured constraint rules
 * Manages rules with priority, tags, and trigger patterns for context-aware filtering
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { z } from 'zod';
import YAML from 'yaml';
import matter from 'gray-matter';

/**
 * Priority levels for rules (1 = highest priority)
 */
export type RulePriority = 1 | 2 | 3 | 4 | 5;

/**
 * Schema for a single constraint rule
 */
export const RuleSchema = z.object({
    id: z.string().describe('Unique identifier for the rule'),
    priority: z.number().min(1).max(5).default(3).describe('Priority level 1-5 (1 = highest)'),
    tags: z.array(z.string()).default([]).describe('Tags for filtering (e.g., "typescript", "security")'),
    trigger_regex: z.string().optional().describe('Regex pattern to match applicable files'),
    content: z.string().describe('The "Never" constraint text'),
    category: z.string().describe('Category for grouping'),
    description: z.string().optional().describe('Human-readable description'),
});

export type Rule = z.infer<typeof RuleSchema>;

/**
 * Schema for a rule pack (collection of rules)
 */
export const RulePackSchema = z.object({
    name: z.string(),
    version: z.string().optional(),
    description: z.string().optional(),
    rules: z.array(RuleSchema),
});

export type RulePack = z.infer<typeof RulePackSchema>;

/**
 * Rule Registry - manages loading, filtering, and prioritizing rules
 */
export class RuleRegistry {
    private rules: Map<string, Rule> = new Map();
    private rulesByTag: Map<string, Rule[]> = new Map();
    private rulesByCategory: Map<string, Rule[]> = new Map();

    constructor() {
        this.rules = new Map();
        this.rulesByTag = new Map();
        this.rulesByCategory = new Map();
    }

    /**
     * Register a single rule
     */
    registerRule(rule: Rule): void {
        // Validate rule
        const validated = RuleSchema.parse(rule);

        this.rules.set(validated.id, validated);

        // Index by tags
        for (const tag of validated.tags) {
            if (!this.rulesByTag.has(tag)) {
                this.rulesByTag.set(tag, []);
            }
            this.rulesByTag.get(tag)!.push(validated);
        }

        // Index by category
        if (!this.rulesByCategory.has(validated.category)) {
            this.rulesByCategory.set(validated.category, []);
        }
        this.rulesByCategory.get(validated.category)!.push(validated);
    }

    /**
     * Register multiple rules from a rule pack
     */
    registerPack(pack: RulePack): void {
        for (const rule of pack.rules) {
            this.registerRule(rule);
        }
    }

    /**
     * Load rules from a JSON file
     */
    loadFromJson(filePath: string): void {
        if (!existsSync(filePath)) {
            throw new Error(`Rule file not found: ${filePath}`);
        }

        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
            for (const rule of data) {
                this.registerRule(rule);
            }
        } else if (data.rules) {
            this.registerPack(data);
        } else {
            this.registerRule(data);
        }
    }

    /**
     * Load rules from a YAML file
     */
    loadFromYaml(filePath: string): void {
        if (!existsSync(filePath)) {
            throw new Error(`Rule file not found: ${filePath}`);
        }

        const content = readFileSync(filePath, 'utf-8');
        const data = YAML.parse(content);

        if (Array.isArray(data)) {
            for (const rule of data) {
                this.registerRule(rule);
            }
        } else if (data.rules) {
            this.registerPack(data);
        } else {
            this.registerRule(data);
        }
    }

    /**
     * Load rules from markdown files (legacy format)
     */
    loadFromMarkdownDirectory(dirPath: string): void {
        if (!existsSync(dirPath)) {
            return;
        }

        const walkDirectory = (path: string): void => {
            const entries = readdirSync(path);

            for (const entry of entries) {
                const fullPath = join(path, entry);
                const stat = statSync(fullPath);

                if (stat.isFile() && entry.endsWith('.md')) {
                    this.loadFromMarkdown(fullPath);
                } else if (stat.isDirectory()) {
                    walkDirectory(fullPath);
                }
            }
        };

        walkDirectory(dirPath);
    }

    /**
     * Load rules from a single markdown file with YAML frontmatter
     */
    loadFromMarkdown(filePath: string): void {
        if (!existsSync(filePath)) {
            return;
        }

        try {
            const content = readFileSync(filePath, 'utf-8');
            const { data, content: markdownContent } = matter(content);

            const category = basename(filePath, '.md');
            const tags = data.tags || [];
            const priority = data.priority || 3;
            const globs = data.globs || '**/*';

            // Extract individual "Never" rules from content
            const lines = markdownContent.split('\n');
            let ruleIndex = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.match(/^[-*]\s+Never\s+/i)) {
                    const ruleContent = trimmed.replace(/^[-*]\s+/, '').trim();
                    ruleIndex++;

                    this.registerRule({
                        id: `${category}-${ruleIndex}`,
                        priority: priority as RulePriority,
                        tags: [...tags, category],
                        trigger_regex: this.globToRegex(globs),
                        content: ruleContent,
                        category: data.name || category,
                        description: data.description,
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to load rules from ${filePath}:`, error);
        }
    }

    /**
     * Convert glob pattern to regex
     */
    private globToRegex(glob: string): string {
        // First escape special regex characters (except glob tokens)
        let result = glob.replace(/[.+^$()[\]{}|\\]/g, '\\$&');
        
        // Then expand glob tokens
        result = result.replace(/\*\*/g, '<<<DOUBLESTAR>>>');
        result = result.replace(/\*/g, '[^/]*');
        result = result.replace(/<<<DOUBLESTAR>>>/g, '.*');
        result = result.replace(/\?/g, '.');
        
        return result;
    }

    /**
     * Get all rules
     */
    getAllRules(): Rule[] {
        return Array.from(this.rules.values());
    }

    /**
     * Get rules by tag
     */
    getRulesByTag(tag: string): Rule[] {
        return this.rulesByTag.get(tag) || [];
    }

    /**
     * Get rules by category
     */
    getRulesByCategory(category: string): Rule[] {
        return this.rulesByCategory.get(category) || [];
    }

    /**
     * Validate regex pattern for safety (basic ReDoS protection)
     */
    private isRegexSafe(pattern: string): boolean {
        // Reject patterns that are too long
        if (pattern.length > 500) {
            return false;
        }
        
        // Reject patterns with excessive nesting or repetition
        const dangerousPatterns = [
            /(\(.*\+.*\)){3,}/, // Nested repetitions
            /(\*|\+|\{[0-9,]+\}){3,}/, // Multiple consecutive quantifiers
            /(.+\|.+){5,}/, // Excessive alternations
        ];
        
        for (const dangerous of dangerousPatterns) {
            if (dangerous.test(pattern)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get rules matching a file path using trigger_regex
     */
    getRulesForFile(filePath: string): Rule[] {
        const matching: Rule[] = [];

        for (const rule of this.rules.values()) {
            if (!rule.trigger_regex) {
                matching.push(rule);
                continue;
            }

            try {
                // Validate pattern before creating regex
                if (!this.isRegexSafe(rule.trigger_regex)) {
                    console.warn(`Unsafe regex pattern skipped for rule ${rule.id}`);
                    continue;
                }
                
                const regex = new RegExp(rule.trigger_regex);
                if (regex.test(filePath)) {
                    matching.push(rule);
                }
            } catch {
                // Invalid regex, skip
            }
        }

        return matching;
    }

    /**
     * Get top N rules by priority for a file
     */
    getTopRulesForFile(filePath: string, count: number = 10): Rule[] {
        const matching = this.getRulesForFile(filePath);
        return this.sortByPriority(matching).slice(0, count);
    }

    /**
     * Sort rules by priority (1 = highest priority first)
     */
    sortByPriority(rules: Rule[]): Rule[] {
        return [...rules].sort((a, b) => a.priority - b.priority);
    }

    /**
     * Get rules matching multiple tags (intersection)
     */
    getRulesByTags(tags: string[]): Rule[] {
        if (tags.length === 0) {
            return this.getAllRules();
        }

        const result: Rule[] = [];

        for (const rule of this.rules.values()) {
            if (tags.every(tag => rule.tags.includes(tag))) {
                result.push(rule);
            }
        }

        return result;
    }

    /**
     * Get all available tags
     */
    getAllTags(): string[] {
        return Array.from(this.rulesByTag.keys());
    }

    /**
     * Get all available categories
     */
    getAllCategories(): string[] {
        return Array.from(this.rulesByCategory.keys());
    }

    /**
     * Get rule count
     */
    getCount(): number {
        return this.rules.size;
    }

    /**
     * Export rules to JSON format
     */
    exportToJson(): string {
        const pack: RulePack = {
            name: 'never-rules',
            version: '1.0.0',
            rules: this.getAllRules(),
        };
        return JSON.stringify(pack, null, 2);
    }

    /**
     * Export rules to YAML format
     */
    exportToYaml(): string {
        const pack: RulePack = {
            name: 'never-rules',
            version: '1.0.0',
            rules: this.getAllRules(),
        };
        return YAML.stringify(pack);
    }

    /**
     * Clear all rules
     */
    clear(): void {
        this.rules.clear();
        this.rulesByTag.clear();
        this.rulesByCategory.clear();
    }
}

/**
 * Create and populate a registry from the library directory
 */
export function createRegistryFromLibrary(libraryPath: string): RuleRegistry {
    const registry = new RuleRegistry();
    registry.loadFromMarkdownDirectory(libraryPath);
    return registry;
}
