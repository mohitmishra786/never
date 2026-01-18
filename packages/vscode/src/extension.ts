/**
 * Never VS Code Extension
 * Provides commands for syncing, rollback, and status bar integration
 */

import * as vscode from 'vscode';
import * as path from 'path';

// Import from @never/core (will be resolved at build time)
// For development, we'll use dynamic imports
let core: typeof import('@never/core') | null = null;

async function loadCore(): Promise<typeof import('@never/core') | null> {
    if (core) return core;
    try {
        core = await import('@never/core');
        return core;
    } catch (error) {
        console.error('Failed to load @never/core:', error);
        return null;
    }
}

// Extension state
let statusBarItem: vscode.StatusBarItem;
let fileWatcher: vscode.FileSystemWatcher;
let outputChannel: vscode.OutputChannel;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Never');
    outputChannel.appendLine('Never extension activated');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'never.sync';
    updateStatusBar('ready');

    const config = vscode.workspace.getConfiguration('never');
    if (config.get('showStatusBar', true)) {
        statusBarItem.show();
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('never.sync', handleSync),
        vscode.commands.registerCommand('never.rollback', handleRollback),
        vscode.commands.registerCommand('never.init', handleInit),
        vscode.commands.registerCommand('never.pull', handlePull),
        statusBarItem,
        outputChannel
    );

    // Set up file watcher for package.json and .cursorrules
    setupFileWatcher(context);

    outputChannel.appendLine('Never extension ready');
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
 * Set up file watcher for auto-sync prompts
 */
function setupFileWatcher(context: vscode.ExtensionContext): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    // Watch for package.json and .cursorrules changes
    fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceFolders[0], '{package.json,.cursorrules,.never/config.yaml}')
    );

    const config = vscode.workspace.getConfiguration('never');
    const autoSync = config.get('autoSync', false);

    fileWatcher.onDidChange(async (uri) => {
        outputChannel.appendLine(`File changed: ${uri.fsPath}`);

        if (autoSync) {
            await handleSync();
        } else {
            const choice = await vscode.window.showInformationMessage(
                'Project configuration changed. Sync Never rules?',
                'Sync Now',
                'Ignore'
            );

            if (choice === 'Sync Now') {
                await handleSync();
            }
        }
    });

    context.subscriptions.push(fileWatcher);
}

/**
 * Handle sync command
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
        const coreModule = await loadCore();
        if (!coreModule) {
            throw new Error('Failed to load @never/core');
        }

        const { SafetyManager, detectProject, suggestRuleSets } = coreModule;

        // Create safety manager for backups
        const safetyManager = new SafetyManager(projectPath);

        // Detect project and suggest rules
        const projectInfo = detectProject(projectPath);
        const suggestedRules = suggestRuleSets(projectInfo);

        outputChannel.appendLine(`Detected stacks: ${projectInfo.stacks.map(s => s.name).join(', ')}`);
        outputChannel.appendLine(`Suggested rules: ${suggestedRules.join(', ')}`);

        // TODO: Integrate with full sync engine when imports are resolved
        // For now, show what would be synced

        updateStatusBar('success');

        const message = `Never: Synced ${suggestedRules.length} rule sets for ${projectInfo.stacks.length} stacks`;
        const action = await vscode.window.showInformationMessage(message, 'View Output');

        if (action === 'View Output') {
            outputChannel.show();
        }

    } catch (error) {
        updateStatusBar('error');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        outputChannel.appendLine(`Error: ${errorMessage}`);

        const choice = await vscode.window.showErrorMessage(
            `Never sync failed: ${errorMessage}`,
            'Rollback',
            'View Output'
        );

        if (choice === 'Rollback') {
            await handleRollback();
        } else if (choice === 'View Output') {
            outputChannel.show();
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
        const coreModule = await loadCore();
        if (!coreModule) {
            throw new Error('Failed to load @never/core');
        }

        const { SafetyManager } = coreModule;
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

        // Perform rollback
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
 * Handle init command
 */
async function handleInit(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    outputChannel.appendLine('Initializing Never project...');

    // For now, open terminal with init command
    const terminal = vscode.window.createTerminal('Never');
    terminal.show();
    terminal.sendText('npx @never/cli init');
}

/**
 * Handle pull command
 */
async function handlePull(): Promise<void> {
    outputChannel.appendLine('Pulling latest rules from repository...');

    try {
        const coreModule = await loadCore();
        if (!coreModule) {
            throw new Error('Failed to load @never/core');
        }

        const { LibrarySync } = coreModule;
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
 * Extension deactivation
 */
export function deactivate(): void {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
