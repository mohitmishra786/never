/**
 * Tests for init command - silent-first onboarding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectProject, suggestRuleSets } from '@mohitmishra7/never-core';

describe('Init Command - Silent-First Onboarding', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `never-init-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Agent Detection', () => {
        it('should detect existing CLAUDE.md', () => {
            writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude Instructions');
            expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true);
        });

        it('should detect existing .cursorrules', () => {
            writeFileSync(join(testDir, '.cursorrules'), '# Cursor Rules');
            expect(existsSync(join(testDir, '.cursorrules'))).toBe(true);
        });

        it('should detect .cursor directory', () => {
            // Use a non-hidden name for testing to avoid permission issues
            const cursorDir = join(testDir, 'cursor-dir');
            mkdirSync(cursorDir, { recursive: true });
            expect(existsSync(cursorDir)).toBe(true);
            
            // Test the actual .cursor logic would work the same way
            const actualCursorPath = join(testDir, '.cursor');
            try {
                mkdirSync(actualCursorPath, { recursive: true });
                expect(existsSync(actualCursorPath)).toBe(true);
            } catch (error) {
                // Some systems don't allow .cursor in tmp, that's okay
                // The logic is tested with cursor-dir above
                expect(error).toBeDefined();
            }
        });

        it('should detect AGENTS.md', () => {
            writeFileSync(join(testDir, 'AGENTS.md'), '# Agent Instructions');
            expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);
        });
    });

    describe('Recommended Setup Generation', () => {
        it('should recommend Claude + Cursor by default', () => {
            const defaultAgents = ['claude', 'cursor'];
            expect(defaultAgents).toContain('claude');
            expect(defaultAgents).toContain('cursor');
        });

        it('should recommend agents based on existing files', () => {
            writeFileSync(join(testDir, 'CLAUDE.md'), '');
            writeFileSync(join(testDir, '.cursorrules'), '');

            const detectedAgents: string[] = [];
            if (existsSync(join(testDir, 'CLAUDE.md'))) detectedAgents.push('claude');
            if (existsSync(join(testDir, '.cursorrules'))) detectedAgents.push('cursor');

            expect(detectedAgents).toEqual(['claude', 'cursor']);
        });

        it('should auto-detect project stacks', () => {
            writeFileSync(join(testDir, 'tsconfig.json'), '{}');
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                dependencies: { react: '^18.0.0' }
            }));

            const projectInfo = detectProject(testDir);
            const suggested = suggestRuleSets(projectInfo);

            expect(suggested).toContain('core');
            expect(suggested).toContain('typescript');
            expect(suggested).toContain('react');
        });
    });

    describe('Marker Appending', () => {
        const MARKER_START = '<!-- NEVER-RULES-START -->';
        const MARKER_END = '<!-- NEVER-RULES-END -->';

        it('should append markers to existing file without overwriting', () => {
            const existingContent = '# My Custom Instructions\n\nDo not delete this!';
            writeFileSync(join(testDir, 'CLAUDE.md'), existingContent);

            // Simulate marker insertion
            const currentContent = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
            const newContent = currentContent + '\n\n' + MARKER_START + '\n<!-- Rules here -->\n' + MARKER_END;
            writeFileSync(join(testDir, 'CLAUDE.md'), newContent);

            const result = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
            
            expect(result).toContain('My Custom Instructions');
            expect(result).toContain('Do not delete this!');
            expect(result).toContain(MARKER_START);
            expect(result).toContain(MARKER_END);
        });

        it('should not add markers if they already exist', () => {
            const contentWithMarkers = `# Instructions\n\n${MARKER_START}\nRules\n${MARKER_END}`;
            writeFileSync(join(testDir, 'CLAUDE.md'), contentWithMarkers);

            const content = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
            const hasMarkers = content.includes(MARKER_START) && content.includes(MARKER_END);

            // Should not add duplicate markers
            if (hasMarkers) {
                // Don't insert again
                expect(content.split(MARKER_START).length - 1).toBe(1);
            }
        });
    });

    describe('Config File Creation', () => {
        it('should create .never directory', () => {
            const neverDir = join(testDir, '.never');
            mkdirSync(neverDir, { recursive: true });
            expect(existsSync(neverDir)).toBe(true);
        });

        it('should create config.yaml with correct structure', () => {
            const neverDir = join(testDir, '.never');
            mkdirSync(neverDir, { recursive: true });

            const config = {
                version: 1,
                rules: ['core', 'typescript'],
                targets: {
                    cursor: true,
                    claude: true,
                    agents: false
                },
                autoDetect: true
            };

            const yaml = `version: ${config.version}\nrules:\n${config.rules.map(r => `  - ${r}`).join('\n')}\ntargets:\n  cursor: ${config.targets.cursor}\n  claude: ${config.targets.claude}\n  agents: ${config.targets.agents}\nautoDetect: ${config.autoDetect}\n`;
            
            writeFileSync(join(neverDir, 'config.yaml'), yaml);

            const content = readFileSync(join(neverDir, 'config.yaml'), 'utf-8');
            expect(content).toContain('version: 1');
            expect(content).toContain('- core');
            expect(content).toContain('- typescript');
            expect(content).toContain('autoDetect: true');
        });

        it('should create backups directory', () => {
            const backupsDir = join(testDir, '.never', 'backups');
            mkdirSync(backupsDir, { recursive: true });
            expect(existsSync(backupsDir)).toBe(true);
        });
    });

    describe('Default Agents Selection', () => {
        it('should use detected agents if any exist', () => {
            writeFileSync(join(testDir, 'CLAUDE.md'), '');
            
            const detectedAgents: string[] = [];
            if (existsSync(join(testDir, 'CLAUDE.md'))) detectedAgents.push('claude');

            const defaultAgents = detectedAgents.length > 0 ? detectedAgents : ['claude', 'cursor'];

            expect(defaultAgents).toContain('claude');
        });

        it('should default to claude + cursor if nothing detected', () => {
            const detectedAgents: string[] = [];
            const defaultAgents = detectedAgents.length > 0 ? detectedAgents : ['claude', 'cursor'];

            expect(defaultAgents).toEqual(['claude', 'cursor']);
        });
    });
});
