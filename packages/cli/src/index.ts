#!/usr/bin/env node
/**
 * Never CLI - Universal AI Constraint Engine
 * 
 * Syncs "Never" constraints to AI coding agents (Cursor, Claude, etc.)
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { listCommand } from './commands/list.js';
import { scanCommand } from './commands/scan.js';
import { lintCommand } from './commands/lint.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
    .name('never')
    .description('Universal AI Constraint Engine - Sync "Never" rules to AI coding agents')
    .version('0.0.8');

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

// Use parseAsync to properly await async command handlers
await program.parseAsync();

