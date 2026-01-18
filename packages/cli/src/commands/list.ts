/**
 * `never list` command
 * List available rule sets and their status
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, getLibraryPath } from '../utils/config.js';
import { loadAllRuleSets } from '../engines/parser.js';

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

    const allRuleSets = loadAllRuleSets(libraryPath);

    // Display rule sets
    for (const [name, ruleSet] of allRuleSets) {
        const isEnabled = enabledRules.includes(name);
        const status = isEnabled ? '[ENABLED]' : '[disabled]';

        if (!showAll && !isEnabled) {
            continue;
        }

        console.log(`${status} ${name}`);

        // Count total rules in this set
        const totalRules = ruleSet.rules.reduce((sum, rule) => sum + rule.rules.length, 0);
        console.log(`  Files: ${ruleSet.rules.length}, Rules: ${totalRules}`);

        // Show file names
        for (const rule of ruleSet.rules) {
            console.log(`    - ${rule.filename}: ${rule.frontmatter.description}`);
        }

        console.log('');
    }

    // Show summary
    console.log('='.repeat(50));
    console.log(`\nTotal rule sets: ${allRuleSets.size}`);
    console.log(`Enabled: ${enabledRules.length > 0 ? enabledRules.join(', ') : 'none (run `never init` first)'}`);

    if (!showAll) {
        console.log('\nUse --all to show all available rule sets.');
    }
}
