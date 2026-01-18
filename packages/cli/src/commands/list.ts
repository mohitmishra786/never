/**
 * `never list` command
 * List available rule sets and their status
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, getLibraryPath, loadRulesFromLibrary } from '@mohitmishra7/never-core';

interface ListOptions {
    all?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
    const projectPath = process.cwd();
    const configPath = join(projectPath, '.never', 'config.yaml');
    const showAll = options.all || false;

    console.log('Available Rule Sets\n');
    console.log('='.repeat(50) + '\n');

    // Load current config if exists
    const config = existsSync(configPath) ? loadConfig(configPath) : null;
    const enabledRules = config?.rules || [];

    // Load all rule sets from library
    const libraryPath = getLibraryPath();

    if (!existsSync(libraryPath)) {
        console.error('Rule library not found.');
        process.exit(1);
    }

    const allRules = loadRulesFromLibrary(libraryPath);

    // Group rules by set (category)
    const ruleSets = new Map<string, typeof allRules>();
    for (const rule of allRules) {
        const category = rule.id.split('/')[0];
        if (!ruleSets.has(category)) {
            ruleSets.set(category, []);
        }
        ruleSets.get(category)!.push(rule);
    }

    // Display rule sets
    for (const [name, rules] of ruleSets) {
        const isEnabled = enabledRules.includes(name);
        const status = isEnabled ? '[ENABLED]' : '[disabled]';

        if (!showAll && !isEnabled) {
            continue;
        }

        console.log(`${status} ${name}`);

        // Count total rules in this set
        const totalRules = rules.reduce((sum: number, rule: any) => sum + rule.rules.length, 0);
        console.log(`  Files: ${rules.length}, Rules: ${totalRules}`);

        // Show file names
        for (const rule of rules) {
            console.log(`    - ${rule.filename}: ${rule.frontmatter.description}`);
        }

        console.log('');
    }

    // Show summary
    console.log('='.repeat(50));
    console.log(`\nTotal rule sets: ${ruleSets.size}`);
    console.log(`Enabled: ${enabledRules.length > 0 ? enabledRules.join(', ') : 'none (run `never init` first)'}`);

    if (!showAll) {
        console.log('\nUse --all to show all available rule sets.');
    }
}
