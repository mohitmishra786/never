/**
 * `never init` command - Interactive project setup
 * Uses @clack/prompts for beautiful CLI wizard
 */

import * as p from '@clack/prompts';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import YAML from 'yaml';
import { detectProject, suggestRuleSets } from '@mohitmishra7/never-core';

interface InitConfig {
    agents: string[];
    ruleSets: string[];
    autoDetect: boolean;
}

const MARKER_START = '<!-- NEVER-RULES-START -->';
const MARKER_END = '<!-- NEVER-RULES-END -->';

/**
 * Insert markers into a file
 */
function insertMarkers(filePath: string, content: string): void {
    let existingContent = '';

    if (existsSync(filePath)) {
        existingContent = readFileSync(filePath, 'utf-8');

        // Check if markers already exist
        if (existingContent.includes(MARKER_START)) {
            console.log(chalk.yellow(`  Markers already exist in ${filePath}`));
            return;
        }
    }

    const markerBlock = `
${MARKER_START}
${content}
${MARKER_END}
`;

    const newContent = existingContent + markerBlock;
    writeFileSync(filePath, newContent, 'utf-8');
}

/**
 * Initialize project with Never
 */
export async function initCommand(): Promise<void> {
    console.clear();

    p.intro(chalk.bold.blue('Welcome to Never!'));

    const projectPath = process.cwd();
    const projectInfo = detectProject(projectPath);
    const suggestedRules = suggestRuleSets(projectInfo);

    // Show detected stacks
    if (projectInfo.stacks.length > 0) {
        p.note(
            projectInfo.stacks.map(s => `• ${s.name} (${s.ruleCount} rules)`).join('\n'),
            'Detected Stacks'
        );
    }

    // Ask which AI agents they're using
    const agents = await p.multiselect({
        message: 'Which AI agents are you using?',
        options: [
            { value: 'claude', label: 'Claude Code', hint: 'Generates CLAUDE.md' },
            { value: 'cursor', label: 'Cursor', hint: 'Generates .cursor/rules/*.mdc' },
            { value: 'windsurf', label: 'Windsurf', hint: 'Generates AGENTS.md' },
            { value: 'opencode', label: 'OpenCode', hint: 'Generates AGENTS.md' },
        ],
        required: true,
        initialValues: ['claude', 'cursor'],
    });

    if (p.isCancel(agents)) {
        p.cancel('Setup cancelled');
        process.exit(0);
    }

    // Rule set selection
    const ruleSets = await p.multiselect({
        message: 'Which rule sets should be active?',
        options: [
            { value: 'core', label: 'Core', hint: 'Safety, accuracy, tone rules' },
            { value: 'typescript', label: 'TypeScript', hint: 'Type safety constraints' },
            { value: 'react', label: 'React', hint: 'React-specific rules' },
            { value: 'python', label: 'Python', hint: 'Python best practices' },
            { value: 'security', label: 'Security', hint: 'Security-focused rules' },
        ],
        required: true,
        initialValues: suggestedRules,
    });

    if (p.isCancel(ruleSets)) {
        p.cancel('Setup cancelled');
        process.exit(0);
    }

    // Auto-detect option
    const autoDetect = await p.confirm({
        message: 'Auto-detect new stacks when syncing?',
        initialValue: true,
    });

    if (p.isCancel(autoDetect)) {
        p.cancel('Setup cancelled');
        process.exit(0);
    }

    // Create config
    const config: InitConfig = {
        agents: agents as string[],
        ruleSets: ruleSets as string[],
        autoDetect: autoDetect as boolean,
    };

    const s = p.spinner();
    s.start('Setting up Never...');

    try {
        // Create .never directory
        const neverDir = join(projectPath, '.never');
        if (!existsSync(neverDir)) {
            mkdirSync(neverDir, { recursive: true });
        }

        // Create config.yaml
        const configYaml = YAML.stringify({
            version: 1,
            rules: config.ruleSets,
            targets: {
                cursor: config.agents.includes('cursor'),
                claude: config.agents.includes('claude'),
                agents: config.agents.includes('windsurf') || config.agents.includes('opencode'),
            },
            autoDetect: config.autoDetect,
        });

        writeFileSync(join(neverDir, 'config.yaml'), configYaml, 'utf-8');

        // Create backups directory
        mkdirSync(join(neverDir, 'backups'), { recursive: true });

        // Insert markers into target files
        if (config.agents.includes('claude')) {
            const claudePath = join(projectPath, 'CLAUDE.md');
            insertMarkers(claudePath, '<!-- Never rules will be synced here -->');
        }

        if (config.agents.includes('windsurf') || config.agents.includes('opencode')) {
            const agentsPath = join(projectPath, 'AGENTS.md');
            insertMarkers(agentsPath, '<!-- Never rules will be synced here -->');
        }

        if (config.agents.includes('cursor')) {
            const cursorDir = join(projectPath, '.cursor', 'rules');
            if (!existsSync(cursorDir)) {
                mkdirSync(cursorDir, { recursive: true });
            }
        }

        s.stop('Setup complete!');

        // Show next steps
        p.note(
            `Run ${chalk.cyan('never sync')} to sync your first rules\n` +
            `Run ${chalk.cyan('never pull')} to fetch latest rules from repository\n` +
            `Run ${chalk.cyan('never lint')} to check your code against active rules`,
            'Next Steps'
        );

        p.outro(chalk.green('Never is ready! Run `never sync` to get started.'));

    } catch (error) {
        s.stop('Setup failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        p.cancel(`Error: ${errorMessage}`);
        process.exit(1);
    }
}

export default initCommand;
