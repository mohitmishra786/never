/**
 * Never VS Code Extension
 * Provides commands for syncing, rollback, and status bar integration
 * Now bundled with core logic - no npx required!
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { 
    SafetyManager,
    detectProject, 
    suggestRuleSets,
    loadConfig,
    getLibraryPath,
    loadRulesFromLibrary,
    writeCategoryMdcFiles,
    updateClaudeFile,
    updateAgentsFile,
    LibrarySync,
    type NeverConfig
} from '@mohitmishra7/never-core';

// Extension state
let statusBarItem: vscode.StatusBarItem;
let fileWatcher: vscode.FileSystemWatcher;
let outputChannel: vscode.OutputChannel;
let debugChannel: vscode.OutputChannel; // Dedicated channel for activation/debug errors
let debounceTimer: NodeJS.Timeout | null = null;

// Debounce delay in milliseconds (2 seconds)
const DEBOUNCE_DELAY = 2000;

/**
 * Check for extension updates
 */
async function checkForUpdates(context: vscode.ExtensionContext): Promise<void> {
    try {
        const currentVersion = context.extension?.packageJSON.version || '0.0.0';
        
        // Fetch latest version from NPM registry
        const response = await fetch('https://registry.npmjs.org/@mohitmishra7/never-cli/latest');
        if (!response.ok) return;
        
        const data = await response.json() as { version?: string };
        const latestVersion = data.version;
        
        // Compare versions (simple string comparison for major.minor.patch)
        if (latestVersion && latestVersion !== currentVersion) {
            const compare = compareVersions(currentVersion, latestVersion);
            if (compare < 0) {
                // Show subtle update notification
                statusBarItem.text = '$(cloud-download) Never (Update Available)';
                statusBarItem.tooltip = `Never v${latestVersion} is available. Current: v${currentVersion}`;
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            }
        }
    } catch (error) {
        // Silently fail - don't bother user with update check errors
        outputChannel.appendLine(`Update check failed: ${error}`);
    }
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(n => parseInt(n, 10));
    const bParts = b.split('.').map(n => parseInt(n, 10));
    
    for (let i = 0; i < 3; i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
    }
    
    return 0;
}

/**
 * Extension activation
 * Wrapped in comprehensive error handling to catch activation failures
 */
export function activate(context: vscode.ExtensionContext) {
    // Create debug channel FIRST - before anything else that could fail
    debugChannel = vscode.window.createOutputChannel('Never Debug');
    debugChannel.appendLine('=== Never Extension Activation Started ===');
    debugChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    debugChannel.appendLine(`VS Code Version: ${vscode.version}`);
    debugChannel.appendLine(`Extension Version: ${context.extension?.packageJSON.version || 'unknown'}`);
    debugChannel.appendLine(`Node Version: ${process.version}`);
    debugChannel.appendLine(`Platform: ${process.platform} ${process.arch}`);
    debugChannel.appendLine('');

    try {
        // Create output channel for normal operations
        outputChannel = vscode.window.createOutputChannel('Never');
        outputChannel.appendLine('Never extension activated');
        debugChannel.appendLine('✓ Output channel created');

        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.command = 'never.sync';
        updateStatusBar('ready');
        debugChannel.appendLine('✓ Status bar item created');

        const config = vscode.workspace.getConfiguration('never');
        if (config.get('showStatusBar', true)) {
            statusBarItem.show();
            debugChannel.appendLine('✓ Status bar item shown');
        }

        // Check for updates (async, don't block activation)
        checkForUpdates(context).catch((error) => {
            debugChannel.appendLine(`⚠ Update check failed (non-critical): ${error}`);
        });

        debugChannel.appendLine('✓ Starting command registration...');

        // Register commands - CRITICAL: These MUST succeed for extension to work
        context.subscriptions.push(
            vscode.commands.registerCommand('never.sync', async () => {
                try {
                    await handleSync();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugChannel.appendLine(`[ERROR] never.sync failed: ${errorMessage}`);
                    if (error instanceof Error && error.stack) {
                        debugChannel.appendLine(error.stack);
                    }
                    vscode.window.showErrorMessage(`Never Sync failed: ${errorMessage}`, 'View Debug Log').then(action => {
                        if (action === 'View Debug Log') {
                            debugChannel.show();
                        }
                    });
                }
            }),
            vscode.commands.registerCommand('never.rollback', async () => {
                try {
                    await handleRollback();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugChannel.appendLine(`[ERROR] never.rollback failed: ${errorMessage}`);
                    if (error instanceof Error && error.stack) {
                        debugChannel.appendLine(error.stack);
                    }
                    vscode.window.showErrorMessage(`Never Rollback failed: ${errorMessage}`, 'View Debug Log').then(action => {
                        if (action === 'View Debug Log') {
                            debugChannel.show();
                        }
                    });
                }
            }),
            vscode.commands.registerCommand('never.init', async () => {
                try {
                    await handleInit();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugChannel.appendLine(`[ERROR] never.init failed: ${errorMessage}`);
                    if (error instanceof Error && error.stack) {
                        debugChannel.appendLine(error.stack);
                    }
                    vscode.window.showErrorMessage(`Never Init failed: ${errorMessage}`, 'View Debug Log').then(action => {
                        if (action === 'View Debug Log') {
                            debugChannel.show();
                        }
                    });
                }
            }),
            vscode.commands.registerCommand('never.pull', async () => {
                try {
                    await handlePull();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugChannel.appendLine(`[ERROR] never.pull failed: ${errorMessage}`);
                    if (error instanceof Error && error.stack) {
                        debugChannel.appendLine(error.stack);
                    }
                    vscode.window.showErrorMessage(`Never Pull failed: ${errorMessage}`, 'View Debug Log').then(action => {
                        if (action === 'View Debug Log') {
                            debugChannel.show();
                        }
                    });
                }
            }),
            vscode.commands.registerCommand('never.doctor', async () => {
                try {
                    await handleDoctor();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugChannel.appendLine(`[ERROR] never.doctor failed: ${errorMessage}`);
                    if (error instanceof Error && error.stack) {
                        debugChannel.appendLine(error.stack);
                    }
                    vscode.window.showErrorMessage(`Never Doctor failed: ${errorMessage}`, 'View Debug Log').then(action => {
                        if (action === 'View Debug Log') {
                            debugChannel.show();
                        }
                    });
                }
            }),
            statusBarItem,
            outputChannel,
            debugChannel
        );

        debugChannel.appendLine('✓ All commands registered successfully');
        debugChannel.appendLine('  - never.sync');
        debugChannel.appendLine('  - never.rollback');
        debugChannel.appendLine('  - never.init');
        debugChannel.appendLine('  - never.pull');
        debugChannel.appendLine('  - never.doctor');

        // Set up file watcher for package.json and .cursorrules
        try {
            setupFileWatcher(context);
            debugChannel.appendLine('✓ File watcher set up successfully');
        } catch (error) {
            // Non-critical error - log but don't fail activation
            debugChannel.appendLine(`⚠ File watcher setup failed (non-critical): ${error}`);
        }

        outputChannel.appendLine('Never extension ready');
        debugChannel.appendLine('');
        debugChannel.appendLine('=== Never Extension Activation COMPLETED SUCCESSFULLY ===');
        debugChannel.appendLine(`Total activation time: ${Date.now()}`);
        debugChannel.appendLine('');
        debugChannel.appendLine('If you see this message, the extension activated correctly.');
        debugChannel.appendLine('If commands are not working, please report this log at:');
        debugChannel.appendLine('https://github.com/mohitmishra786/never/issues');
        
    } catch (error) {
        // CRITICAL ERROR during activation
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error && error.stack ? error.stack : 'No stack trace';
        
        debugChannel.appendLine('');
        debugChannel.appendLine('=== CRITICAL: ACTIVATION FAILED ===');
        debugChannel.appendLine(`Error: ${errorMessage}`);
        debugChannel.appendLine(`Stack trace:\n${errorStack}`);
        debugChannel.appendLine('');
        debugChannel.appendLine('This is a critical error. The extension did not load properly.');
        debugChannel.appendLine('Please copy this entire log and report it at:');
        debugChannel.appendLine('https://github.com/mohitmishra786/never/issues');
        
        // Show the debug channel immediately
        debugChannel.show();
        
        // Show error message with helpful actions
        vscode.window.showErrorMessage(
            `Never extension failed to activate: ${errorMessage}`,
            'View Debug Log',
            'Copy Error',
            'Report Issue'
        ).then(action => {
            if (action === 'View Debug Log') {
                debugChannel.show();
            } else if (action === 'Copy Error') {
                const errorReport = `Never Extension Activation Error\n\nVersion: ${context.extension?.packageJSON.version || 'unknown'}\nNode: ${process.version}\nVS Code: ${vscode.version}\n\nError: ${errorMessage}\n\nStack:\n${errorStack}`;
                vscode.env.clipboard.writeText(errorReport);
                vscode.window.showInformationMessage('Error details copied to clipboard');
            } else if (action === 'Report Issue') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/mohitmishra786/never/issues/new'));
            }
        });
        
        // Re-throw to ensure VS Code knows activation failed
        throw error;
    }
}

/**
 * Update status bar item
 */
function updateStatusBar(state: 'ready' | 'syncing' | 'error' | 'success'): void {
    switch (state) {
        case 'ready':
            statusBarItem.text = '$(shield) Never';
            statusBarItem.tooltip = 'Click to sync Never rules';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'syncing':
            statusBarItem.text = '$(sync~spin) Never';
            statusBarItem.tooltip = 'Syncing rules...';
            break;
        case 'success':
            statusBarItem.text = '$(shield-check) Never';
            statusBarItem.tooltip = 'Rules synced successfully';
            statusBarItem.backgroundColor = undefined;
            setTimeout(() => updateStatusBar('ready'), 3000);
            break;
        case 'error':
            statusBarItem.text = '$(shield-x) Never';
            statusBarItem.tooltip = 'Sync failed - click to retry';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
    }
}

/**
 * Debounced sync handler
 * Only triggers sync after DEBOUNCE_DELAY milliseconds of inactivity
 */
function debouncedSync(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    updateStatusBar('ready');
    statusBarItem.text = '$(sync~spin) Never (waiting...)';

    debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        await handleSync();
    }, DEBOUNCE_DELAY);
}

/**
 * Set up file watcher for auto-sync prompts with debouncing
 * Only triggers sync 2 seconds after the last file change to avoid CPU spikes
 */
function setupFileWatcher(context: vscode.ExtensionContext): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    // Watch for package.json and .cursorrules changes
    fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceFolders[0], '{package.json,.cursorrules,.never/config.yaml,CLAUDE.md,AGENTS.md}')
    );

    const config = vscode.workspace.getConfiguration('never');
    const autoSync = config.get('autoSync', false);

    fileWatcher.onDidChange(async (uri) => {
        outputChannel.appendLine(`File changed: ${uri.fsPath}`);

        if (autoSync) {
            // Use debounced sync for auto-sync mode
            outputChannel.appendLine('Auto-sync enabled: debouncing...');
            debouncedSync();
        } else {
            // For manual mode, still show prompt but debounce it
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(async () => {
                debounceTimer = null;
                const choice = await vscode.window.showInformationMessage(
                    'Project configuration changed. Sync Never rules?',
                    'Sync Now',
                    'Ignore'
                );

                if (choice === 'Sync Now') {
                    await handleSync();
                }
            }, DEBOUNCE_DELAY);
        }
    });

    context.subscriptions.push(fileWatcher);
}

/**
 * Handle sync command - now with full sync functionality!
 */
async function handleSync(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const projectPath = workspaceFolders[0].uri.fsPath;
    updateStatusBar('syncing');
    outputChannel.appendLine(`Syncing rules for: ${projectPath}`);

    try {
        // Load or create config
        const configPath = path.join(projectPath, '.never', 'config.yaml');
        let config: NeverConfig;

        if (existsSync(configPath)) {
            const loadedConfig = loadConfig(configPath);
            if (!loadedConfig) {
                throw new Error('Failed to load config. Please run Never: Initialize Project first.');
            }
            config = loadedConfig;
        } else {
            // Auto-detect and create temporary config
            const projectInfo = detectProject(projectPath);
            const suggestedRules = suggestRuleSets(projectInfo);

            config = {
                version: 1,
                rules: suggestedRules,
                targets: {
                    cursor: projectInfo.hasCursor || existsSync(path.join(projectPath, '.cursor')),
                    claude: true,
                    agents: true,
                },
                autoDetect: true,
            };

            outputChannel.appendLine('No config found, using auto-detected settings');
        }

        // Apply auto-detection if enabled
        if (config.autoDetect) {
            const projectInfo = detectProject(projectPath);
            const detectedRules = suggestRuleSets(projectInfo);
            config.rules = [...new Set([...config.rules, ...detectedRules])];
            outputChannel.appendLine(`Auto-detected stacks: ${projectInfo.stacks.map(s => s.name).join(', ')}`);
        }

        outputChannel.appendLine(`Active rule sets: ${config.rules.join(', ')}`);

        // Load rules from library
        const libraryPath = getLibraryPath();
        if (!existsSync(libraryPath)) {
            throw new Error('Rule library not found. Try running Never: Update Rule Library first.');
        }

        const allRules = loadRulesFromLibrary(libraryPath);
        const activeRules = allRules.filter(rule => {
            const category = rule.id.split('/')[0];
            return config.rules.includes(category);
        });

        outputChannel.appendLine(`Processing ${activeRules.length} rule files`);

        // Generate outputs
        const generatedFiles: string[] = [];

        if (config.targets.cursor) {
            const files = writeCategoryMdcFiles(projectPath, activeRules, false);
            generatedFiles.push(...files);
            outputChannel.appendLine(`Created ${files.length} Cursor .mdc files`);
        }

        if (config.targets.claude) {
            const result = updateClaudeFile(projectPath, activeRules, false);
            generatedFiles.push(result.path);
            outputChannel.appendLine(`Updated CLAUDE.md`);
        }

        if (config.targets.agents) {
            const result = updateAgentsFile(projectPath, activeRules, false);
            generatedFiles.push(result.path);
            outputChannel.appendLine(`Updated AGENTS.md`);
        }

        updateStatusBar('success');
        vscode.window.showInformationMessage(
            `Never: Successfully synced ${generatedFiles.length} files!`,
            'View Output'
        ).then(action => {
            if (action === 'View Output') {
                outputChannel.show();
            }
        });

    } catch (error) {
        updateStatusBar('error');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Always log to output channel for debugging
        outputChannel.appendLine(`[ERROR] Sync failed: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            outputChannel.appendLine(`Stack trace:\n${error.stack}`);
        }

        const choice = await vscode.window.showErrorMessage(
            `Never sync failed: ${errorMessage}`,
            'View Output',
            'Check Health',
            'Copy Error'
        );

        if (choice === 'View Output') {
            outputChannel.show();
        } else if (choice === 'Check Health') {
            await handleDoctor();
        } else if (choice === 'Copy Error') {
            const errorDetails = `Never Sync Error:\n${errorMessage}\n\nVersion: ${vscode.extensions.getExtension('mohitmishra.never-vscode')?.packageJSON.version}\nWorkspace: ${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath}\n\nPlease report this at: https://github.com/mohitmishra786/never/issues`;
            await vscode.env.clipboard.writeText(errorDetails);
            vscode.window.showInformationMessage('Error details copied to clipboard');
        }
    }
}

/**
 * Handle rollback command
 */
async function handleRollback(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const projectPath = workspaceFolders[0].uri.fsPath;
    outputChannel.appendLine(`Rolling back in: ${projectPath}`);

    try {
        const safetyManager = new SafetyManager(projectPath);

        // List available backups
        const backups = safetyManager.listBackups();

        if (backups.length === 0) {
            vscode.window.showInformationMessage('No backups available to restore');
            return;
        }

        // Show quick pick for backup selection
        const items = backups.map(b => ({
            label: path.basename(b.filePath),
            description: new Date(b.timestamp).toLocaleString(),
            detail: `${(b.size / 1024).toFixed(1)} KB`,
            backup: b
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a backup to restore'
        });

        if (!selected) return;

        // Confirm rollback
        const confirm = await vscode.window.showWarningMessage(
            `Restore ${selected.label} from ${selected.description}?`,
            'Restore',
            'Cancel'
        );

        if (confirm !== 'Restore') return;

        // Perform rollback - filePath now contains the full relative path
        const targetPath = path.join(projectPath, selected.backup.filePath);
        const success = safetyManager.rollback(targetPath, selected.backup.backupPath);

        if (success) {
            vscode.window.showInformationMessage(`Restored ${selected.label} successfully`);
            outputChannel.appendLine(`Restored: ${targetPath}`);
        } else {
            vscode.window.showErrorMessage('Rollback failed');
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Rollback failed: ${errorMessage}`);
        outputChannel.appendLine(`Rollback error: ${errorMessage}`);
    }
}

/**
 * Handle init command - now fully integrated, no npx required!
 */
async function handleInit(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const projectPath = workspaceFolders[0].uri.fsPath;
    outputChannel.appendLine('Initializing Never project...');

    try {
        // Check if already initialized
        const configPath = path.join(projectPath, '.never', 'config.yaml');
        if (existsSync(configPath)) {
            const choice = await vscode.window.showWarningMessage(
                'Never is already initialized in this project. Overwrite?',
                'Yes',
                'No'
            );
            if (choice !== 'Yes') return;
        }

        // Detect project
        const projectInfo = detectProject(projectPath);
        const suggestedRules = suggestRuleSets(projectInfo);

        // Detect agents from existing files
        const detectedAgents: string[] = [];
        if (existsSync(path.join(projectPath, 'CLAUDE.md'))) detectedAgents.push('claude');
        if (existsSync(path.join(projectPath, '.cursorrules')) || existsSync(path.join(projectPath, '.cursor'))) {
            detectedAgents.push('cursor');
        }
        if (existsSync(path.join(projectPath, 'AGENTS.md'))) detectedAgents.push('agents');

        const defaultAgents = detectedAgents.length > 0 ? detectedAgents : ['claude', 'cursor'];

        // Show quick pick for setup
        const setupChoice = await vscode.window.showQuickPick([
            {
                label: '$(rocket) Quick Setup (Recommended)',
                description: `Agents: ${defaultAgents.join(', ')} | Rules: ${suggestedRules.join(', ')}`,
                detail: 'Use auto-detected settings',
                value: 'quick'
            },
            {
                label: '$(gear) Custom Setup',
                description: 'Choose your own settings',
                detail: 'Select agents and rules manually',
                value: 'custom'
            }
        ], {
            placeHolder: 'How would you like to set up Never?'
        });

        if (!setupChoice) return;

        let agents = defaultAgents;
        let rules = suggestedRules;

        if (setupChoice.value === 'custom') {
            // Custom setup flow
            const agentChoices = await vscode.window.showQuickPick([
                { label: 'Claude Code', picked: agents.includes('claude'), value: 'claude' },
                { label: 'Cursor', picked: agents.includes('cursor'), value: 'cursor' },
                { label: 'Windsurf/OpenCode', picked: agents.includes('agents'), value: 'agents' },
            ], { canPickMany: true, placeHolder: 'Select AI agents' });

            if (!agentChoices || agentChoices.length === 0) {
                vscode.window.showErrorMessage('No agents selected');
                return;
            }

            agents = agentChoices.map(c => c.value);

            const ruleChoices = await vscode.window.showQuickPick([
                { label: 'Core', picked: true, value: 'core' },
                { label: 'TypeScript', picked: rules.includes('typescript'), value: 'typescript' },
                { label: 'React', picked: rules.includes('react'), value: 'react' },
                { label: 'Python', picked: rules.includes('python'), value: 'python' },
                { label: 'Security', picked: rules.includes('security'), value: 'security' },
            ], { canPickMany: true, placeHolder: 'Select rule sets' });

            if (!ruleChoices || ruleChoices.length === 0) {
                vscode.window.showErrorMessage('No rules selected');
                return;
            }

            rules = ruleChoices.map(c => c.value);
        }

        // Create .never directory
        const neverDir = path.join(projectPath, '.never');
        if (!existsSync(neverDir)) {
            mkdirSync(neverDir, { recursive: true });
        }

        // Create backups directory
        const backupsDir = path.join(neverDir, 'backups');
        if (!existsSync(backupsDir)) {
            mkdirSync(backupsDir, { recursive: true });
        }

        // Create config.yaml
        const config = {
            version: 1,
            rules: rules,
            targets: {
                cursor: agents.includes('cursor'),
                claude: agents.includes('claude'),
                agents: agents.includes('agents'),
            },
            autoDetect: true,
        };

        const yaml = `version: ${config.version}\nrules:\n${config.rules.map(r => `  - ${r}`).join('\n')}\ntargets:\n  cursor: ${config.targets.cursor}\n  claude: ${config.targets.claude}\n  agents: ${config.targets.agents}\nautoDetect: ${config.autoDetect}\n`;
        
        writeFileSync(configPath, yaml, 'utf-8');

        outputChannel.appendLine('Never initialized successfully');
        outputChannel.appendLine(`Config: ${configPath}`);

        vscode.window.showInformationMessage(
            'Never initialized! Run sync to generate rule files.',
            'Sync Now'
        ).then(action => {
            if (action === 'Sync Now') {
                handleSync();
            }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Init failed: ${errorMessage}`);
        outputChannel.appendLine(`Init error: ${errorMessage}`);
    }
}

/**
 * Handle pull command
 */
async function handlePull(): Promise<void> {
    outputChannel.appendLine('Pulling latest rules from repository...');

    try {
        const librarySync = new LibrarySync();

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Never: Updating rule library...',
            cancellable: false
        }, async () => {
            const result = await librarySync.pull();

            if (result.errors.length > 0) {
                outputChannel.appendLine(`Errors: ${result.errors.join(', ')}`);
            }

            vscode.window.showInformationMessage(
                `Never: Updated ${result.updated} rules, ${result.cached} unchanged`
            );
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to update rules: ${errorMessage}`);
        outputChannel.appendLine(`Pull error: ${errorMessage}`);
    }
}

/**
 * Handle doctor command - health check and diagnostics
 */
async function handleDoctor(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const projectPath = workspaceFolders[0].uri.fsPath;
    outputChannel.appendLine('Running Never health check...');
    outputChannel.show();

    interface HealthCheck {
        name: string;
        status: 'pass' | 'warn' | 'fail';
        message: string;
        fix?: string;
    }

    const checks: HealthCheck[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    checks.push({
        name: 'Node.js Version',
        status: nodeMajor >= 18 ? 'pass' : 'fail',
        message: nodeMajor >= 18 ? `Node.js ${nodeVersion}` : `Node.js ${nodeVersion} is too old`,
        fix: nodeMajor < 18 ? 'Upgrade to Node.js 18 or higher' : undefined,
    });

    // Check for .never/config.yaml
    const configPath = path.join(projectPath, '.never', 'config.yaml');
    if (existsSync(configPath)) {
        checks.push({
            name: 'Never Config',
            status: 'pass',
            message: 'Found .never/config.yaml',
        });
    } else {
        checks.push({
            name: 'Never Config',
            status: 'fail',
            message: 'Never not initialized',
            fix: 'Run: Never: Initialize Project',
        });
    }

    // Check for instruction files
    const MARKER_START = '<!-- NEVER-RULES-START -->';
    const MARKER_END = '<!-- NEVER-RULES-END -->';

    const checkMarkers = (filePath: string): boolean => {
        if (!existsSync(filePath)) return false;
        const content = readFileSync(filePath, 'utf-8');
        return content.includes(MARKER_START) && content.includes(MARKER_END);
    };

    const claudePath = path.join(projectPath, 'CLAUDE.md');
    if (existsSync(claudePath)) {
        const hasMarkers = checkMarkers(claudePath);
        checks.push({
            name: 'CLAUDE.md',
            status: hasMarkers ? 'pass' : 'warn',
            message: hasMarkers ? 'Found with markers' : 'Found but missing markers',
            fix: hasMarkers ? undefined : 'Run: Never: Sync Rules',
        });
    } else {
        checks.push({
            name: 'CLAUDE.md',
            status: 'warn',
            message: 'Not found',
            fix: 'Run: Never: Initialize Project or create file manually',
        });
    }

    // Check for .gitignore
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (existsSync(gitignorePath)) {
        const content = readFileSync(gitignorePath, 'utf-8');
        const hasNeverBackups = content.includes('.never/backups') || content.includes('.never/');
        checks.push({
            name: '.gitignore',
            status: hasNeverBackups ? 'pass' : 'warn',
            message: hasNeverBackups ? 'Never backups are ignored' : 'Never backups not in .gitignore',
            fix: hasNeverBackups ? undefined : 'Add ".never/backups/" to .gitignore',
        });
    } else {
        checks.push({
            name: '.gitignore',
            status: 'warn',
            message: 'No .gitignore found',
            fix: 'Create .gitignore to ensure Never backups are ignored',
        });
    }

    // Display results in output channel
    outputChannel.appendLine('\n🩺 Never Health Check Results:\n');
    outputChannel.appendLine('─'.repeat(60));

    for (const check of checks) {
        const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
        outputChannel.appendLine(`${icon} ${check.name}: ${check.message}`);
        if (check.fix) {
            outputChannel.appendLine(`  → Fix: ${check.fix}`);
        }
        outputChannel.appendLine('');
    }

    const passed = checks.filter(c => c.status === 'pass').length;
    const warned = checks.filter(c => c.status === 'warn').length;
    const failed = checks.filter(c => c.status === 'fail').length;

    outputChannel.appendLine('─'.repeat(60));
    outputChannel.appendLine(`Summary: ${passed} passed · ${warned} warnings · ${failed} failed\n`);

    // Show appropriate message
    if (failed > 0) {
        vscode.window.showErrorMessage(
            `Never health check: ${failed} critical issue(s) found. Check output for details.`,
            'View Output'
        ).then(action => {
            if (action === 'View Output') {
                outputChannel.show();
            }
        });
    } else if (warned > 0) {
        vscode.window.showWarningMessage(
            `Never health check: ${warned} warning(s) found. Check output for details.`,
            'View Output'
        ).then(action => {
            if (action === 'View Output') {
                outputChannel.show();
            }
        });
    } else {
        vscode.window.showInformationMessage('Never health check: Everything looks good!');
    }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    if (debugChannel) {
        debugChannel.appendLine('=== Never Extension Deactivating ===');
        debugChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    }

    // Clear any pending debounce timers
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    if (fileWatcher) {
        fileWatcher.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
    if (debugChannel) {
        debugChannel.appendLine('Never extension deactivated cleanly');
        debugChannel.dispose();
    }
}
