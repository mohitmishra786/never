#!/usr/bin/env node
/**
 * Never CLI - Universal AI Constraint Engine
 * 
 * Syncs "Never" constraints to AI coding agents (Cursor, Claude, etc.)
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { listCommand } from './commands/list.js';
import { scanCommand } from './commands/scan.js';
import { lintCommand } from './commands/lint.js';
import { doctorCommand } from './commands/doctor.js';

const CLI_VERSION = '1.0.2';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if running from global install vs local and warn about version mismatch
 */
function checkVersionMismatch(): void {
    try {
        const localPackageJson = join(process.cwd(), 'node_modules', '@mohitmishra7', 'never-cli', 'package.json');
        if (existsSync(localPackageJson)) {
            const localPkg = JSON.parse(readFileSync(localPackageJson, 'utf-8'));
            if (localPkg.version !== CLI_VERSION) {
                console.warn(`\x1b[33m⚠ Version mismatch: Global CLI is v${CLI_VERSION}, local project has v${localPkg.version}\x1b[0m`);
                console.warn(`  Consider running: npx @mohitmishra7/never-cli@${localPkg.version}\n`);
            }
        }
    } catch {
        // Ignore errors - version check is optional
    }
}

const program = new Command();

program
    .name('never')
    .description('Universal AI Constraint Engine - Sync "Never" rules to AI coding agents')
    .version(CLI_VERSION)
    .action(() => {
        // Show help when no command is provided
        program.outputHelp();
    });

program
    .command('init')
    .description('Initialize Never in the current project (creates .never/config.yaml)')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(initCommand);

program
    .command('sync')
    .description('Sync rules to agent-specific files (Cursor, Claude, AGENTS.md)')
    .option('-c, --config <path>', 'Path to config file', '.never/config.yaml')
    .option('-v, --verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be generated without writing files')
    .option('--local-only', 'Skip remote rule updates (use cached rules only)')
    .action(syncCommand);

program
    .command('list')
    .description('List available rule sets')
    .option('-a, --all', 'Show all rules including disabled ones')
    .action(listCommand);

program
    .command('scan')
    .description('Auto-detect tech stack and recommend rule packs')
    .option('--json', 'Output in JSON format')
    .option('-v, --verbose', 'Show detailed output')
    .action(scanCommand);

program
    .command('lint')
    .description('Check current git diff against active "Nevers" and report violations')
    .option('--staged', 'Only check staged changes (for pre-commit hooks)')
    .option('--json', 'Output violations in JSON format')
    .option('-v, --verbose', 'Show detailed output')
    .option('-c, --config <path>', 'Path to config file', '.never/config.yaml')
    .action(lintCommand);

program
    .command('doctor')
    .description('Run health checks and diagnose common issues')
    .action(doctorCommand);

// Check for version mismatch before running
checkVersionMismatch();

// Use parseAsync to properly await async command handlers
await program.parseAsync();

