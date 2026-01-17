/**
 * `never init` command
 * Initialize Never in the current project
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { detectProject, suggestRuleSets } from '../utils/detect.js';
import { saveConfig, createDefaultConfig } from '../utils/config.js';

interface InitOptions {
    force?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
    const projectPath = process.cwd();
    const configPath = join(projectPath, '.never', 'config.yaml');

    console.log('Initializing Never...\n');

    // Check if already initialized
    if (existsSync(configPath) && !options.force) {
        console.log('Never is already initialized in this project.');
        console.log('Use --force to overwrite the existing configuration.\n');
        return;
    }

    // Detect project type
    console.log('Detecting project type...');
    const projectInfo = detectProject(projectPath);

    if (projectInfo.frameworks.length > 0) {
        console.log(`Detected: ${projectInfo.frameworks.join(', ')}\n`);
    } else {
        console.log('No specific frameworks detected. Using core rules only.\n');
    }

    // Suggest rule sets based on detection
    const suggestedRules = suggestRuleSets(projectInfo);
    console.log(`Suggested rule sets: ${suggestedRules.join(', ')}\n`);

    // Create configuration
    const config = createDefaultConfig(suggestedRules);

    // Detect which agents are present
    if (projectInfo.hasCursor) {
        console.log('Detected Cursor - enabling .mdc output');
        config.targets.cursor = true;
    }

    // Check for existing CLAUDE.md
    if (existsSync(join(projectPath, 'CLAUDE.md'))) {
        console.log('Detected existing CLAUDE.md - will update it');
        config.targets.claude = true;
    }

    // Save configuration
    saveConfig(configPath, config);
    console.log(`Created: ${configPath}\n`);

    console.log('Next steps:');
    console.log('  1. Review .never/config.yaml and adjust rule sets if needed');
    console.log('  2. Run `never sync` to generate agent-specific files');
    console.log('  3. Commit the generated files to your repository\n');
}
