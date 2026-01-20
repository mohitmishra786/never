/**
 * Tests for Environment Detection
 * Verifies detection of Cursor, Copilot, and Claude Code environments
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectEnvironment } from './StackScanner.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Environment Detection', () => {
    let testDir: string;
    const originalEnv = process.env;

    beforeEach(() => {
        testDir = join(tmpdir(), `never-env-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        // Reset environment for each test
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        process.env = originalEnv;
    });

    describe('Cursor Detection', () => {
        it('should detect Cursor when .cursor directory exists', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });

            const env = detectEnvironment(testDir);

            expect(env.cursor).toBe(true);
            expect(env.detectionDetails.cursorReason).toContain('.cursor');
        });

        it('should detect Cursor when .cursorrules file exists', () => {
            writeFileSync(join(testDir, '.cursorrules'), '');

            const env = detectEnvironment(testDir);

            expect(env.cursor).toBe(true);
            expect(env.detectionDetails.cursorReason).toContain('.cursorrules');
        });

        it('should detect Cursor via TERM_PROGRAM environment variable', () => {
            process.env.TERM_PROGRAM = 'cursor';

            const env = detectEnvironment(testDir);

            expect(env.cursor).toBe(true);
            expect(env.detectionDetails.cursorReason).toContain('TERM_PROGRAM');
        });

        it('should not detect Cursor in clean environment', () => {
            const env = detectEnvironment(testDir);

            expect(env.cursor).toBe(false);
        });
    });

    describe('Copilot Detection', () => {
        it('should detect Copilot when .github/copilot-instructions.md exists', () => {
            mkdirSync(join(testDir, '.github'), { recursive: true });
            writeFileSync(join(testDir, '.github', 'copilot-instructions.md'), '');

            const env = detectEnvironment(testDir);

            expect(env.copilot).toBe(true);
            expect(env.detectionDetails.copilotReason).toContain('copilot-instructions');
        });

        it('should detect Copilot when .github directory exists without Cursor', () => {
            mkdirSync(join(testDir, '.github'), { recursive: true });

            const env = detectEnvironment(testDir);

            expect(env.copilot).toBe(true);
        });

        it('should not detect Copilot when only Cursor is present', () => {
            process.env.TERM_PROGRAM = 'cursor';
            // No .github directory

            const env = detectEnvironment(testDir);

            expect(env.copilot).toBe(false);
        });
    });

    describe('Claude Detection', () => {
        it('should detect Claude when CLAUDE.md exists', () => {
            writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude Instructions');

            const env = detectEnvironment(testDir);

            expect(env.claude).toBe(true);
            expect(env.detectionDetails.claudeReason).toContain('CLAUDE.md');
        });

        it('should detect Claude when .claude directory exists', () => {
            mkdirSync(join(testDir, '.claude'), { recursive: true });

            const env = detectEnvironment(testDir);

            expect(env.claude).toBe(true);
            expect(env.detectionDetails.claudeReason).toContain('.claude');
        });

        it('should detect Claude via CLAUDE_CODE environment variable', () => {
            process.env.CLAUDE_CODE = '1';

            const env = detectEnvironment(testDir);

            expect(env.claude).toBe(true);
        });

        it('should detect Claude via ANTHROPIC_API_KEY environment variable', () => {
            process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

            const env = detectEnvironment(testDir);

            expect(env.claude).toBe(true);
        });
    });

    describe('Multi-Environment Detection', () => {
        it('should detect multiple environments simultaneously', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });
            writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude');
            // Create .github with explicit copilot file so it triggers even with Cursor
            mkdirSync(join(testDir, '.github'), { recursive: true });
            writeFileSync(join(testDir, '.github', 'copilot-instructions.md'), '');

            const env = detectEnvironment(testDir);

            expect(env.cursor).toBe(true);
            expect(env.copilot).toBe(true);
            expect(env.claude).toBe(true);
        });

        it('should generate warning when both Cursor and Copilot are detected', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });
            mkdirSync(join(testDir, '.github'), { recursive: true });
            writeFileSync(join(testDir, '.github', 'copilot-instructions.md'), '');

            const env = detectEnvironment(testDir);

            expect(env.warnings.length).toBeGreaterThan(0);
            expect(env.warnings.some(w => w.includes('Cursor') && w.includes('Copilot'))).toBe(true);
        });

        it('should return empty warnings when only one environment is detected', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });

            const env = detectEnvironment(testDir);

            // Only Cursor detected, no Copilot, so no conflict warning
            expect(env.warnings.length).toBe(0);
        });
    });

    describe('EnvironmentInfo Structure', () => {
        it('should return properly structured EnvironmentInfo', () => {
            mkdirSync(join(testDir, '.cursor'), { recursive: true });

            const env = detectEnvironment(testDir);

            expect(typeof env.cursor).toBe('boolean');
            expect(typeof env.copilot).toBe('boolean');
            expect(typeof env.claude).toBe('boolean');
            expect(Array.isArray(env.warnings)).toBe(true);
            expect(typeof env.detectionDetails).toBe('object');
        });
    });
});
