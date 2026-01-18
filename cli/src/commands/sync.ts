/**
 * `never sync` command
 * Parse rules and generate agent-specific files
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, getLibraryPath, type NeverConfig } from '../utils/config.js';
import { detectProject, suggestRuleSets } from '../utils/detect.js';
import { loadAllRuleSets, getRulesForSets } from '../engines/parser.js';
import { rulesToMdc, writeMdcFiles } from '../engines/to-mdc.js';
import { updateClaudeFile } from '../engines/to-claude.js';
import { updateAgentsFile } from '../engines/to-agents.js';

interface SyncOptions {
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
    const projectPath = process.cwd();
    const configPath = options.config || join(projectPath, '.never', 'config.yaml');
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;

    if (dryRun) {
        console.log('[DRY RUN] No files will be written.\n');
    }

    console.log('Syncing Never rules...\n');

    // Load configuration
    let config: NeverConfig;
    if (existsSync(configPath)) {
        const loadedConfig = loadConfig(configPath);
        if (!loadedConfig) {
            console.error('Failed to load configuration. Run `never init` first.');
            process.exit(1);
        }
        config = loadedConfig;
    } else {
        console.log('No .never/config.yaml found. Using auto-detection...\n');

        // Auto-detect and create temporary config
        const projectInfo = detectProject(projectPath);
        const suggestedRules = suggestRuleSets(projectInfo);

        config = {
            version: 1,
            rules: suggestedRules,
            targets: {
                cursor: projectInfo.hasCursor || existsSync(join(projectPath, '.cursor')),
                claude: true,
                agents: true,
            },
            autoDetect: true,
        };
    }

    // Apply auto-detection if enabled
    if (config.autoDetect) {
        const projectInfo = detectProject(projectPath);
        const detectedRules = suggestRuleSets(projectInfo);

        // Merge detected rules with configured rules
        const mergedRules = [...new Set([...config.rules, ...detectedRules])];
        config.rules = mergedRules;

        if (verbose) {
            console.log(`Auto-detected frameworks: ${projectInfo.frameworks.join(', ') || 'none'}`);
            console.log(`Active rule sets: ${config.rules.join(', ')}\n`);
        }
    }

    // Load rule library
    const libraryPath = getLibraryPath();
    if (verbose) {
        console.log(`Loading rules from: ${libraryPath}`);
    }

    if (!existsSync(libraryPath)) {
        console.error(`Rule library not found at: ${libraryPath}`);
        console.error('Make sure the Never library is available.');
        process.exit(1);
    }

    const allRuleSets = loadAllRuleSets(libraryPath);

    if (verbose) {
        console.log(`Found ${allRuleSets.size} rule sets: ${[...allRuleSets.keys()].join(', ')}\n`);
    }

    // Get rules for the configured rule sets
    const activeRules = getRulesForSets(allRuleSets, config.rules);

    console.log(`Processing ${activeRules.length} rule files from sets: ${config.rules.join(', ')}\n`);

    // Count total rules
    const totalRules = activeRules.reduce((sum, rule) => sum + rule.rules.length, 0);
    console.log(`Total individual rules: ${totalRules}\n`);

    // Generate outputs for each enabled target
    const generatedFiles: string[] = [];

    // Cursor .mdc files
    if (config.targets.cursor) {
        console.log('Generating Cursor .mdc files...');
        const mdcOutputs = rulesToMdc(activeRules);
        const files = writeMdcFiles(projectPath, mdcOutputs, dryRun);
        generatedFiles.push(...files);
        console.log(`  Created ${files.length} .mdc files in .cursor/rules/`);
    }

    // CLAUDE.md
    if (config.targets.claude) {
        console.log('Generating CLAUDE.md...');
        const claudeResult = updateClaudeFile(projectPath, activeRules, dryRun);
        generatedFiles.push(claudeResult.path);
        console.log(`  Updated: ${claudeResult.path}`);
    }

    // AGENTS.md
    if (config.targets.agents) {
        console.log('Generating AGENTS.md...');
        const agentsResult = updateAgentsFile(projectPath, activeRules, dryRun);
        generatedFiles.push(agentsResult.path);
        console.log(`  Updated: ${agentsResult.path}`);
    }

    console.log(`\nSync complete. Generated ${generatedFiles.length} files.`);

    if (!dryRun) {
        console.log('\nGenerated files:');
        for (const file of generatedFiles) {
            console.log(`  - ${file}`);
        }
    }
}
