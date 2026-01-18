/**
 * SafetyManager - Handles atomic writes, backups, and rollback
 * Ensures files are never corrupted during sync operations
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';

export interface BackupInfo {
    filePath: string;
    backupPath: string;
    timestamp: number;
    size: number;
}

export interface DiffEntry {
    type: 'add' | 'remove' | 'unchanged';
    content: string;
}

export interface FileDiff {
    filePath: string;
    before: string | null;
    after: string;
    changes: DiffEntry[];
}

/**
 * SafetyManager class for safe file operations
 */
export class SafetyManager {
    private backupDir: string;

    constructor(projectPath: string) {
        this.backupDir = join(projectPath, '.never', 'backups');
    }

    /**
     * Ensure backup directory exists
     */
    private ensureBackupDir(): void {
        if (!existsSync(this.backupDir)) {
            mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Atomic write: write to .tmp file, then rename
     * This prevents file corruption if the process crashes mid-write
     */
    atomicWrite(filePath: string, content: string): void {
        const tmpPath = `${filePath}.tmp`;
        const dir = dirname(filePath);

        // Ensure directory exists
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Write to temporary file
        writeFileSync(tmpPath, content, 'utf-8');

        // Atomic rename (POSIX guarantees atomic rename within same filesystem)
        renameSync(tmpPath, filePath);
    }

    /**
     * Create a backup of a file before modifying it
     * Returns the backup file path
     */
    createBackup(filePath: string): string | null {
        if (!existsSync(filePath)) {
            return null;
        }

        this.ensureBackupDir();

        const timestamp = Date.now();
        const fileName = basename(filePath);
        const backupPath = join(this.backupDir, `${fileName}.${timestamp}.bak`);

        copyFileSync(filePath, backupPath);

        return backupPath;
    }

    /**
     * Safe write: backup first, then atomic write
     */
    safeWrite(filePath: string, content: string): string | null {
        const backupPath = this.createBackup(filePath);
        this.atomicWrite(filePath, content);
        return backupPath;
    }

    /**
     * List all available backups for a file
     */
    listBackups(fileName?: string): BackupInfo[] {
        if (!existsSync(this.backupDir)) {
            return [];
        }

        const entries = readdirSync(this.backupDir);
        const backups: BackupInfo[] = [];

        for (const entry of entries) {
            if (!entry.endsWith('.bak')) continue;

            // Parse filename: FILENAME.TIMESTAMP.bak
            const match = entry.match(/^(.+)\.(\d+)\.bak$/);
            if (!match) continue;

            const [, originalName, timestampStr] = match;

            // Filter by fileName if provided
            if (fileName && originalName !== fileName) continue;

            const backupPath = join(this.backupDir, entry);
            const stat = statSync(backupPath);

            backups.push({
                filePath: originalName,
                backupPath,
                timestamp: parseInt(timestampStr, 10),
                size: stat.size,
            });
        }

        // Sort by timestamp descending (newest first)
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get the most recent backup for a file
     */
    getLatestBackup(fileName: string): BackupInfo | null {
        const backups = this.listBackups(fileName);
        return backups.length > 0 ? backups[0] : null;
    }

    /**
     * Rollback a file to a specific backup or the latest one
     */
    rollback(filePath: string, backupPath?: string): boolean {
        const fileName = basename(filePath);

        if (!backupPath) {
            const latest = this.getLatestBackup(fileName);
            if (!latest) {
                return false;
            }
            backupPath = latest.backupPath;
        }

        if (!existsSync(backupPath)) {
            return false;
        }

        const content = readFileSync(backupPath, 'utf-8');
        this.atomicWrite(filePath, content);

        return true;
    }

    /**
     * Generate a diff between current content and new content
     */
    generateDiff(filePath: string, newContent: string): FileDiff {
        const before = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null;
        const changes: DiffEntry[] = [];

        if (before === null) {
            // New file
            for (const line of newContent.split('\n')) {
                changes.push({ type: 'add', content: line });
            }
        } else {
            // Compare line by line
            const beforeLines = before.split('\n');
            const afterLines = newContent.split('\n');

            let i = 0;
            let j = 0;

            while (i < beforeLines.length || j < afterLines.length) {
                if (i >= beforeLines.length) {
                    changes.push({ type: 'add', content: afterLines[j++] });
                } else if (j >= afterLines.length) {
                    changes.push({ type: 'remove', content: beforeLines[i++] });
                } else if (beforeLines[i] === afterLines[j]) {
                    changes.push({ type: 'unchanged', content: beforeLines[i] });
                    i++;
                    j++;
                } else {
                    // Simple diff: mark as remove then add
                    changes.push({ type: 'remove', content: beforeLines[i++] });
                    changes.push({ type: 'add', content: afterLines[j++] });
                }
            }
        }

        return {
            filePath,
            before,
            after: newContent,
            changes,
        };
    }

    /**
     * Format diff for display
     */
    formatDiff(diff: FileDiff): string {
        const lines: string[] = [];
        lines.push(`--- ${diff.filePath}`);
        lines.push(`+++ ${diff.filePath}`);

        for (const change of diff.changes) {
            if (change.type === 'add') {
                lines.push(`+ ${change.content}`);
            } else if (change.type === 'remove') {
                lines.push(`- ${change.content}`);
            }
            // Skip unchanged lines for brevity
        }

        return lines.join('\n');
    }

    /**
     * Clean up old backups, keeping only the most recent N
     */
    pruneBackups(fileName: string, keepCount: number = 5): number {
        const backups = this.listBackups(fileName);
        let deleted = 0;

        for (let i = keepCount; i < backups.length; i++) {
            const { unlinkSync } = require('fs');
            try {
                unlinkSync(backups[i].backupPath);
                deleted++;
            } catch {
                // Ignore deletion errors
            }
        }

        return deleted;
    }
}

/**
 * Create a SafetyManager instance for a project
 */
export function createSafetyManager(projectPath: string): SafetyManager {
    return new SafetyManager(projectPath);
}
