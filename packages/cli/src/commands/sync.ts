/**
 * `never sync` command
 * Parse rules and generate agent-specific files
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import {
    loadConfig,
    getLibraryPath,
    type NeverConfig,
    detectProject,
    suggestRuleSets,
    generateStackSummary,
    SyncEngine,
    RuleRegistry,
    loadRulesFromLibrary,
    writeCategoryMdcFiles,
    updateClaudeFile,
    updateAgentsFile,
    generateSkillFile,
    type RulePack
} from '@mohitmishra7/never-core';

interface SyncOptions {
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
    skill?: boolean;
    localOnly?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
    const projectPath = process.cwd();
    const configPath = options.config || join(projectPath, '.never', 'config.yaml');
    const verbose = options.verbose || false;
    const dryRun = options.dryRun || false;
    const generateSkill = options.skill || false;
    const localOnly = options.localOnly || false;

    if (dryRun) {
        console.log(chalk.yellow('[DRY RUN] No files will be written.\n'));
    }

    if (localOnly) {
        console.log(chalk.yellow('[LOCAL-ONLY] Skipping remote rule updates.\n'));
    }

    console.log(chalk.bold('Syncing Never rules...\n'));

    // Load configuration
    let config: NeverConfig;
    if (existsSync(configPath)) {
        const loadedConfig = loadConfig(projectPath);
        if (!loadedConfig) {
            console.error(chalk.red('Failed to load configuration. Run `never init` first.'));
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
    const projectInfo = detectProject(projectPath);
    if (config.autoDetect) {
        const detectedRules = suggestRuleSets(projectInfo);

        // Merge detected rules with configured rules
        const mergedRules = [...new Set([...config.rules, ...detectedRules])];
        config.rules = mergedRules;

        if (verbose) {
            console.log(`Auto-detected frameworks: ${projectInfo.frameworks.join(', ') || 'none'}`);
            console.log(`Active rule sets: ${config.rules.join(', ')}\n`);
        }
    }

    // Display stack summary
    console.log(chalk.cyan(generateStackSummary(projectInfo)));
    console.log();

    // Load rule library
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const bundledPath = join(__dirname, '..', '..', 'library'); // Resolves to package root/library
    const libraryPath = getLibraryPath(bundledPath);
    if (verbose) {
        console.log(`Loading rules from: ${libraryPath}`);
    }

    if (!existsSync(libraryPath)) {
        console.error(chalk.red(`Rule library not found at: ${libraryPath}`));
        process.exit(1);
    }

    const allRules = loadRulesFromLibrary(libraryPath);

    if (verbose) {
        const categories = new Set(allRules.map(r => r.id.split('/')[0]));
        console.log(`Found ${categories.size} rule sets: ${[...categories].join(', ')}\n`);
    }

    // Get rules for the configured rule sets
    const activeRules = allRules.filter(rule => {
        const category = rule.id.split('/')[0];
        return config.rules.includes(category);
    });

    console.log(`Processing ${activeRules.length} rule files from sets: ${config.rules.join(', ')}\n`);

    // Count total rules
    const totalRules = activeRules.reduce((sum: number, rule: any) => sum + rule.rules.length, 0);
    console.log(`Total individual rules: ${totalRules}\n`);

    // Generate outputs for each enabled target
    const generatedFiles: string[] = [];

    // Cursor .mdc files (category-specific)
    if (config.targets.cursor) {
        console.log(chalk.blue('Generating Cursor .mdc files (by category)...'));
        const files = writeCategoryMdcFiles(projectPath, activeRules, dryRun);
        generatedFiles.push(...files);
        console.log(`  Created ${files.length} category .mdc files in .cursor/rules/`);
    }

    // CLAUDE.md
    if (config.targets.claude) {
        console.log(chalk.blue('Generating CLAUDE.md...'));
        const claudeResult = updateClaudeFile(projectPath, activeRules, dryRun);
        generatedFiles.push(claudeResult.path);
        console.log(`  Updated: ${claudeResult.path}`);
    }

    // AGENTS.md
    if (config.targets.agents) {
        console.log(chalk.blue('Generating AGENTS.md...'));
        const agentsResult = updateAgentsFile(projectPath, activeRules, dryRun);
        generatedFiles.push(agentsResult.path);
        console.log(`  Updated: ${agentsResult.path}`);
    }

    // Claude Skills (optional)
    if (generateSkill) {
        console.log(chalk.blue('Generating Claude SKILL.md...'));
        const skillResult = generateSkillFile(projectPath, activeRules, dryRun);
        generatedFiles.push(skillResult.path);
        console.log(`  Created: ${skillResult.path}`);
    }

    console.log(chalk.green(`\n✓ Sync complete. Generated ${generatedFiles.length} files.`));

    if (!dryRun && verbose) {
        console.log('\nGenerated files:');
        for (const file of generatedFiles) {
            console.log(`  - ${file}`);
        }
    }
}
