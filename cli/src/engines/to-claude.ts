/**
 * Claude CLAUDE.md format converter
 * Generates or updates CLAUDE.md file for Claude Code
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ParsedRule } from './parser.js';

const NEVER_SECTION_START = '<!-- NEVER-RULES-START -->';
const NEVER_SECTION_END = '<!-- NEVER-RULES-END -->';

/**
 * Generate CLAUDE.md content from rules
 */
export function generateClaudeContent(rules: ParsedRule[]): string {
    const sections: string[] = [];

    // Group rules by their id prefix (e.g., "core/safety" -> "Safety & Security")
    const groupedRules = new Map<string, ParsedRule[]>();

    for (const rule of rules) {
        const groupName = rule.frontmatter.name;
        if (!groupedRules.has(groupName)) {
            groupedRules.set(groupName, []);
        }
        groupedRules.get(groupName)!.push(rule);
    }

    // Generate content for each group
    for (const [groupName, groupRules] of groupedRules) {
        sections.push(`## ${groupName}\n`);

        for (const rule of groupRules) {
            // Add each individual "Never" rule as a bullet point
            for (const neverRule of rule.rules) {
                sections.push(`- ${neverRule}`);
            }
        }

        sections.push(''); // Add blank line between sections
    }

    return sections.join('\n');
}

/**
 * Generate the full CLAUDE.md file content
 */
export function generateClaudeFile(rules: ParsedRule[]): string {
    const rulesContent = generateClaudeContent(rules);

    return `# CLAUDE.md - Project Constraints for Claude Code

This file contains project-specific constraints and "Never" rules that Claude should follow.
These rules are automatically synced by [Never CLI](https://github.com/mohitmishra786/never).

${NEVER_SECTION_START}

# Constraints

${rulesContent}
${NEVER_SECTION_END}
`;
}

/**
 * Update existing CLAUDE.md or create new one
 */
export function updateClaudeFile(
    projectPath: string,
    rules: ParsedRule[],
    dryRun: boolean = false
): string {
    const claudePath = join(projectPath, 'CLAUDE.md');
    const rulesContent = generateClaudeContent(rules);
    let finalContent: string;

    if (existsSync(claudePath)) {
        // Read existing file
        const existingContent = readFileSync(claudePath, 'utf-8');

        // Check if it has our markers
        if (existingContent.includes(NEVER_SECTION_START) && existingContent.includes(NEVER_SECTION_END)) {
            // Replace the section between markers
            const beforeMarker = existingContent.split(NEVER_SECTION_START)[0];
            const afterMarker = existingContent.split(NEVER_SECTION_END)[1] || '';

            finalContent = `${beforeMarker}${NEVER_SECTION_START}

# Constraints

${rulesContent}
${NEVER_SECTION_END}${afterMarker}`;
        } else {
            // Append our section to the end
            finalContent = `${existingContent.trim()}

---

${NEVER_SECTION_START}

# Never Constraints

The following constraints are automatically synced by [Never CLI](https://github.com/mohitmishra786/never).

${rulesContent}
${NEVER_SECTION_END}
`;
        }
    } else {
        // Create new file
        finalContent = generateClaudeFile(rules);
    }

    if (!dryRun) {
        writeFileSync(claudePath, finalContent, 'utf-8');
    }

    return claudePath;
}
