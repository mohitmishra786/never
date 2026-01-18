/**
 * Generator Utilities for Never
 */

import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ParsedRule } from './SyncEngine.js';
import { SafetyManager } from './SafetyManager.js';

const MARKER_START = '<!-- NEVER-RULES-START -->';
const MARKER_END = '<!-- NEVER-RULES-END -->';

export function replaceMarkerSection(content: string, newSection: string): string {
    const startIndex = content.indexOf(MARKER_START);
    const endIndex = content.indexOf(MARKER_END, startIndex);

    if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing section
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex + MARKER_END.length);
        return `${before}${MARKER_START}\n${newSection}\n${MARKER_END}${after}`;
    }

    // Append new section
    return `${content}\n\n${MARKER_START}\n${newSection}\n${MARKER_END}\n`;
}

/**
 * Generate .mdc files for Cursor
 */
export function writeCategoryMdcFiles(projectPath: string, rules: ParsedRule[], dryRun = false): string[] {
    const rulesDir = join(projectPath, '.cursor', 'rules');
    if (!dryRun && !existsSync(rulesDir)) {
        mkdirSync(rulesDir, { recursive: true });
    }

    const rulesByCategory: Record<string, ParsedRule[]> = {};
    for (const rule of rules) {
        const category = rule.id.split('/')[0];
        if (!rulesByCategory[category]) {
            rulesByCategory[category] = [];
        }
        rulesByCategory[category].push(rule);
    }

    const files: string[] = [];
    const safety = new SafetyManager(projectPath);

    for (const [category, categoryRules] of Object.entries(rulesByCategory)) {
        const filename = `never-${category}.mdc`;
        const filePath = join(rulesDir, filename);

        const content = `---
description: ${category} rules
globs: ${categoryRules.map(r => r.frontmatter.globs).join(', ')}
---

# ${category} Rules

${categoryRules.flatMap(r => r.rules.map(rule => `- ${rule}`)).join('\n')}
`;

        if (!dryRun) {
            safety.atomicWrite(filePath, content);
        }
        files.push(filePath);
    }

    return files;
}

/**
 * Generate SKILL.md for Claude
 */
export function generateSkillFile(projectPath: string, rules: ParsedRule[], dryRun = false): { path: string, content: string, written: boolean } {
    const skillPath = join(projectPath, 'SKILL.md');

    // Simple skill generation
    const content = `---
description: Never Guardian Skill
---

<skill_definitions>
<definition>
<name>check_constraints</name>
<description>Check code against defined constraints</description>
<parameters>
<parameter>
<name>code</name>
<type>string</type>
<description>Code snippet to check</description>
<required>true</required>
</parameter>
</parameters>
</definition>
</skill_definitions>

# Rules

${rules.flatMap(r => r.rules.map(rule => `- ${rule}`)).join('\n')}
`;

    if (!dryRun) {
        const safety = new SafetyManager(projectPath);
        safety.atomicWrite(skillPath, content);
    }

    return { path: skillPath, content, written: !dryRun };
}

/**
 * Update CLAUDE.md
 */
export function updateClaudeFile(projectPath: string, rules: ParsedRule[], dryRun = false): { path: string, content: string, written: boolean } {
    const filePath = join(projectPath, 'CLAUDE.md');
    let existingContent = '';

    if (existsSync(filePath)) {
        existingContent = readFileSync(filePath, 'utf-8');
    }

    const newRules = rules.flatMap(r => r.rules.map(rule => `- ${rule}`)).join('\n');
    const newContent = replaceMarkerSection(existingContent, newRules);

    if (!dryRun) {
        const safety = new SafetyManager(projectPath);
        if (existingContent && existingContent !== '') {
            safety.createBackup(filePath);
        }
        safety.atomicWrite(filePath, newContent);
    }

    return { path: filePath, content: newContent, written: !dryRun };
}


/**
 * Update AGENTS.md
 */
export function updateAgentsFile(projectPath: string, rules: ParsedRule[], dryRun = false): { path: string, content: string, written: boolean } {
    const filePath = join(projectPath, 'AGENTS.md');
    let existingContent = '';

    if (existsSync(filePath)) {
        existingContent = readFileSync(filePath, 'utf-8');
    }

    const newRules = rules.flatMap(r => r.rules.map(rule => `- ${rule}`)).join('\n');
    const newContent = replaceMarkerSection(existingContent, newRules);

    if (!dryRun) {
        const safety = new SafetyManager(projectPath);
        if (existingContent && existingContent !== '') {
            safety.createBackup(filePath);
        }
        safety.atomicWrite(filePath, newContent);
    }

    return { path: filePath, content: newContent, written: !dryRun };
}
