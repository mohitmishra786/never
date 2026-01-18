/**
 * SyncEngine - Central orchestration for all sync operations
 * Coordinates rule processing and output generation for multiple targets
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, getLibraryPath, type NeverConfig } from '../utils/config.js';
import { detectProject, suggestRuleSets } from '../utils/detect.js';
import { loadAllRuleSets, getRulesForSets, type ParsedRule } from '../engines/parser.js';
import { rulesToMdc, writeMdcFiles } from '../engines/to-mdc.js';
import { updateClaudeFile } from '../engines/to-claude.js';
import { updateAgentsFile } from '../engines/to-agents.js';
import type { SyncResult } from '../schema.js';

export interface SyncEngineOptions {
    projectPath: string;
    configPath?: string;
    dryRun?: boolean;
    verbose?: boolean;
}

export interface SyncSummary {
    results: SyncResult[];
    totalRuleFiles: number;
    totalRules: number;
    targets: string[];
}

/**
 * SyncEngine class for orchestrating rule synchronization
 */
export class SyncEngine {
    private projectPath: string;
    private config: NeverConfig;
    private activeRules: ParsedRule[];
    private dryRun: boolean;
    private verbose: boolean;
    private results: SyncResult[];

    constructor(options: SyncEngineOptions) {
        this.projectPath = options.projectPath;
        this.dryRun = options.dryRun || false;
        this.verbose = options.verbose || false;
        this.results = [];
        this.activeRules = [];

        // Load configuration
        this.config = this.loadConfiguration(options.configPath);
    }

    /**
     * Load and merge configuration
     */
    private loadConfiguration(configPath?: string): NeverConfig {
        const path = configPath || join(this.projectPath, '.never', 'config.yaml');

        if (existsSync(path)) {
            const loaded = loadConfig(path);
            if (loaded) {
                return loaded;
            }
        }

        // Fall back to auto-detection
        const projectInfo = detectProject(this.projectPath);
        const suggestedRules = suggestRuleSets(projectInfo);

        return {
            version: 1,
            rules: suggestedRules,
            targets: {
                cursor: projectInfo.hasCursor || existsSync(join(this.projectPath, '.cursor')),
                claude: true,
                agents: true,
            },
            autoDetect: true,
        };
    }

    /**
     * Load rules from the library
     */
    loadRules(): void {
        // Apply auto-detection if enabled
        if (this.config.autoDetect) {
            const projectInfo = detectProject(this.projectPath);
            const detectedRules = suggestRuleSets(projectInfo);
            this.config.rules = [...new Set([...this.config.rules, ...detectedRules])];

            if (this.verbose) {
                console.log(`Auto-detected frameworks: ${projectInfo.frameworks.join(', ') || 'none'}`);
            }
        }

        // Load rule library
        const libraryPath = getLibraryPath();
        if (!existsSync(libraryPath)) {
            throw new Error(`Rule library not found at: ${libraryPath}`);
        }

        const allRuleSets = loadAllRuleSets(libraryPath);
        this.activeRules = getRulesForSets(allRuleSets, this.config.rules);

        if (this.verbose) {
            console.log(`Loaded ${this.activeRules.length} rule files from sets: ${this.config.rules.join(', ')}`);
        }
    }

    /**
     * Sync rules to Cursor .mdc files
     */
    syncToCursor(): SyncResult[] {
        if (!this.config.targets.cursor) {
            return [];
        }

        const mdcOutputs = rulesToMdc(this.activeRules);
        const files = writeMdcFiles(this.projectPath, mdcOutputs, this.dryRun);

        const results: SyncResult[] = files.map((path, index) => ({
            path,
            content: mdcOutputs[index]?.content || '',
            written: !this.dryRun,
            target: 'cursor' as const,
        }));

        this.results.push(...results);
        return results;
    }

    /**
     * Sync rules to CLAUDE.md
     */
    syncToClaude(): SyncResult {
        const engineResult = updateClaudeFile(this.projectPath, this.activeRules, this.dryRun);

        const result: SyncResult = {
            path: engineResult.path,
            content: engineResult.content,
            written: engineResult.written,
            target: 'claude' as const,
        };

        this.results.push(result);
        return result;
    }

    /**
     * Sync rules to AGENTS.md
     */
    syncToAgents(): SyncResult {
        const engineResult = updateAgentsFile(this.projectPath, this.activeRules, this.dryRun);

        const result: SyncResult = {
            path: engineResult.path,
            content: engineResult.content,
            written: engineResult.written,
            target: 'agents' as const,
        };

        this.results.push(result);
        return result;
    }

    /**
     * Sync rules to SKILL.md (for AI agent skills)
     */
    syncToSkill(): SyncResult | null {
        // SKILL.md is similar to AGENTS.md but for skill-based systems
        // Only sync if explicitly enabled (future feature)
        return null;
    }

    /**
     * Run all enabled sync operations
     */
    syncAll(): SyncSummary {
        this.loadRules();
        const targets: string[] = [];

        if (this.config.targets.cursor) {
            this.syncToCursor();
            targets.push('cursor');
        }

        if (this.config.targets.claude) {
            this.syncToClaude();
            targets.push('claude');
        }

        if (this.config.targets.agents) {
            this.syncToAgents();
            targets.push('agents');
        }

        const totalRules = this.activeRules.reduce((sum, rule) => sum + rule.rules.length, 0);

        return {
            results: this.results,
            totalRuleFiles: this.activeRules.length,
            totalRules,
            targets,
        };
    }

    /**
     * Get active rules (after loadRules has been called)
     */
    getActiveRules(): ParsedRule[] {
        return this.activeRules;
    }

    /**
     * Get current configuration
     */
    getConfig(): NeverConfig {
        return this.config;
    }

    /**
     * Get all sync results
     */
    getResults(): SyncResult[] {
        return this.results;
    }
}
