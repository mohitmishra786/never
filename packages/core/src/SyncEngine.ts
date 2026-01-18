/**
 * SyncEngine - Orchestrates rule synchronization across all targets
 * Core implementation for @mohitmishra7/never-core
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import YAML from 'yaml';
import matter from 'gray-matter';
import { SafetyManager } from './SafetyManager.js';
import { ConflictDetector } from './ConflictDetector.js';

export interface ParsedRule {
    id: string;
    filename: string;
    frontmatter: RuleFrontmatter;
    content: string;
    rules: string[];
}

export interface RuleFrontmatter {
    name: string;
    description: string;
    tags: string[];
    globs: string;
    alwaysApply: boolean;
}

import { NeverConfig } from './config.js';

export interface SyncResult {
    target: string;
    path: string;
    ruleCount: number;
    skipped: number;
    success: boolean;
}

export interface SyncOptions {
    dryRun?: boolean;
    verbose?: boolean;
    detectConflicts?: boolean;
}

const DEFAULT_FRONTMATTER: RuleFrontmatter = {
    name: 'Unnamed Rule',
    description: '',
    tags: [],
    globs: '**/*',
    alwaysApply: true,
};

const MARKER_START = '<!-- NEVER-RULES-START -->';
const MARKER_END = '<!-- NEVER-RULES-END -->';

/**
 * Parse a single rule file
 */
function parseRuleFile(filePath: string, category: string): ParsedRule | null {
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
        for (const line of markdownContent.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.match(/^[-*]\s+Never\s+/i)) {
                rules.push(trimmed.replace(/^[-*]\s+/, '').trim());
            }
        }

        return {
            id: `${category}/${basename(filePath, '.md')}`,
            filename: basename(filePath),
            frontmatter,
            content: markdownContent,
            rules,
        };
    } catch {
        return null;
    }
}

/**
 * Load all rules from a library directory
 */
export function loadRulesFromLibrary(libraryPath: string): ParsedRule[] {
    const rules: ParsedRule[] = [];

    if (!existsSync(libraryPath)) {
        return rules;
    }

    const walkDirectory = (dirPath: string, category: string = ''): void => {
        const entries = readdirSync(dirPath);
        const dirName = basename(dirPath);

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);

            if (stat.isFile() && entry.endsWith('.md')) {
                const parsed = parseRuleFile(fullPath, category || dirName);
                if (parsed) {
                    rules.push(parsed);
                }
            } else if (stat.isDirectory()) {
                // Preserve the top-level category for nested folders
                walkDirectory(fullPath, category || dirName);
            }
        }
    };

    walkDirectory(libraryPath);
    return rules;
}

/**
 * Generate rule content for CLAUDE.md
 */
function generateClaudeContent(rules: ParsedRule[]): string {
    const lines: string[] = [];
    lines.push('## Never Rules (Auto-Generated)\n');
    lines.push('The following constraints are managed by [Never CLI](https://github.com/mohitmishra786/never).\n');

    for (const rule of rules) {
        for (const ruleText of rule.rules) {
            lines.push(`- ${ruleText}`);
        }
    }

    return lines.join('\n');
}

/**
 * Replace or insert content between markers
 */
function replaceMarkerSection(content: string, newSection: string): string {
    const startIndex = content.indexOf(MARKER_START);
    const endIndex = content.indexOf(MARKER_END, startIndex);

    if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing section
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex + MARKER_END.length);
        return `${before}${MARKER_START}\n${newSection}\n${MARKER_END}${after}`;
    }

    // Append new section
    return `${content}\n\n${MARKER_START}\n${newSection}\n${MARKER_END}\n`;
}

/**
 * SyncEngine class - orchestrates rule synchronization
 */
export class SyncEngine {
    private projectPath: string;
    private libraryPath: string;
    private safetyManager: SafetyManager;
    private conflictDetector: ConflictDetector;

    constructor(projectPath: string, libraryPath: string) {
        this.projectPath = projectPath;
        this.libraryPath = libraryPath;
        this.safetyManager = new SafetyManager(projectPath);
        this.conflictDetector = new ConflictDetector();
    }

    /**
     * Load configuration from .never/config.yaml
     */
    loadConfig(): NeverConfig | null {
        const configPath = join(this.projectPath, '.never', 'config.yaml');

        if (!existsSync(configPath)) {
            return null;
        }

        try {
            const content = readFileSync(configPath, 'utf-8');
            return YAML.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Get all rules from library
     */
    getRules(filterSets?: string[]): ParsedRule[] {
        const allRules = loadRulesFromLibrary(this.libraryPath);

        if (!filterSets || filterSets.length === 0) {
            return allRules;
        }

        return allRules.filter(rule => {
            const category = rule.id.split('/')[0];
            return filterSets.includes(category);
        });
    }

    /**
     * Sync rules to CLAUDE.md
     */
    syncToClaude(rules: ParsedRule[], options: SyncOptions = {}): SyncResult {
        const claudePath = join(this.projectPath, 'CLAUDE.md');
        let filteredRules = rules;
        let skipped = 0;

        // Check for conflicts and filter rules
        if (options.detectConflicts && existsSync(claudePath)) {
            const existing = readFileSync(claudePath, 'utf-8');
            const ruleTexts = rules.flatMap(r => r.rules);
            const { safe, skipped: skippedRules } = this.conflictDetector.filterConflictingRules(
                existing,
                ruleTexts
            );
            skipped = skippedRules.length;
            
            // Filter rules to only include safe ones
            const safeRuleSet = new Set(safe);
            filteredRules = rules.map(r => ({
                ...r,
                rules: r.rules.filter(ruleText => safeRuleSet.has(ruleText))
            })).filter(r => r.rules.length > 0);
        }

        const newContent = generateClaudeContent(filteredRules);

        if (!options.dryRun) {
            // Backup first
            this.safetyManager.createBackup(claudePath);

            // Update file
            const existingContent = existsSync(claudePath)
                ? readFileSync(claudePath, 'utf-8')
                : '';
            const updated = replaceMarkerSection(existingContent, newContent);
            this.safetyManager.atomicWrite(claudePath, updated);
        }

        return {
            target: 'claude',
            path: claudePath,
            ruleCount: filteredRules.reduce((sum, r) => sum + r.rules.length, 0),
            skipped,
            success: true,
        };
    }

    /**
     * Sync rules to AGENTS.md
     */
    syncToAgents(rules: ParsedRule[], options: SyncOptions = {}): SyncResult {
        const agentsPath = join(this.projectPath, 'AGENTS.md');
        const newContent = generateClaudeContent(rules);

        if (!options.dryRun) {
            this.safetyManager.createBackup(agentsPath);

            const existingContent = existsSync(agentsPath)
                ? readFileSync(agentsPath, 'utf-8')
                : '';
            const updated = replaceMarkerSection(existingContent, newContent);
            this.safetyManager.atomicWrite(agentsPath, updated);
        }

        return {
            target: 'agents',
            path: agentsPath,
            ruleCount: rules.reduce((sum, r) => sum + r.rules.length, 0),
            skipped: 0,
            success: true,
        };
    }

    /**
     * Sync all targets based on config
     */
    syncAll(options: SyncOptions = {}): SyncResult[] {
        const config = this.loadConfig();
        const filterSets = config?.rules || ['core'];
        const rules = this.getRules(filterSets);
        const results: SyncResult[] = [];

        if (!config || config.targets.claude) {
            results.push(this.syncToClaude(rules, options));
        }

        if (config?.targets.agents) {
            results.push(this.syncToAgents(rules, options));
        }

        return results;
    }

    /**
     * Get diff preview without writing
     */
    getDiff(rules: ParsedRule[]): { claude?: string; agents?: string } {
        const claudePath = join(this.projectPath, 'CLAUDE.md');
        const agentsPath = join(this.projectPath, 'AGENTS.md');
        const newClaudeContent = generateClaudeContent(rules);
        const newAgentsContent = generateClaudeContent(rules); // Reuse same generator for agents

        const result: { claude?: string; agents?: string } = {};

        if (existsSync(claudePath)) {
            const existingClaude = readFileSync(claudePath, 'utf-8');
            const updatedClaude = replaceMarkerSection(existingClaude, newClaudeContent);
            const diff = this.safetyManager.generateDiff(claudePath, updatedClaude);
            result.claude = this.safetyManager.formatDiff(diff);
        }

        if (existsSync(agentsPath)) {
            const existingAgents = readFileSync(agentsPath, 'utf-8');
            const updatedAgents = replaceMarkerSection(existingAgents, newAgentsContent);
            const diff = this.safetyManager.generateDiff(agentsPath, updatedAgents);
            result.agents = this.safetyManager.formatDiff(diff);
        }

        return result;
    }
}

/**
 * Create a SyncEngine instance
 */
export function createSyncEngine(projectPath: string, libraryPath: string): SyncEngine {
    return new SyncEngine(projectPath, libraryPath);
}
