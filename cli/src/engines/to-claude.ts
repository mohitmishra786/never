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
 * Result of a sync operation for testability
 */
export interface EngineSyncResult {
    path: string;
    content: string;
    written: boolean;
}

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
 * Replace the section between two markers in existing content with new rules content.
 *
 * Searches for `startMarker` and then locates `endMarker` after the start to avoid false matches.
 * If both markers are found and properly ordered, returns the content with the section between
 * them replaced by a standard "Constraints" block containing `rulesContent`. If markers are
 * missing or misordered, returns `null`.
 *
 * @param existingContent - The original full text to search and modify
 * @param rulesContent - Markdown content to insert between the markers
 * @param startMarker - The exact start marker string that begins the replaceable section
 * @param endMarker - The exact end marker string that ends the replaceable section
 * @returns The updated content with the marked section replaced, or `null` if markers are not found or invalid
 */
function replaceMarkerSection(
    existingContent: string,
    rulesContent: string,
    startMarker: string,
    endMarker: string
): string | null {
    const startIndex = existingContent.indexOf(startMarker);
    // Find end marker AFTER the start marker to avoid false matches
    const endIndex = existingContent.indexOf(
        endMarker,
        startIndex + startMarker.length
    );

    // Validate marker positions
    if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
        return null;
    }

    const beforeMarker = existingContent.slice(0, startIndex);
    const afterMarker = existingContent.slice(endIndex + endMarker.length);

    return `${beforeMarker}${startMarker}

# Constraints

${rulesContent}
${endMarker}${afterMarker}`;
}

/**
 * Synchronizes the project's CLAUDE.md with the provided Claude constraints.
 *
 * Replaces the section between the NEVER markers if present; if markers are missing or misordered,
 * appends a new never-rules section to the file. If CLAUDE.md does not exist, creates a new file
 * containing the generated content. Honors dry-run mode by computing the final content without
 * writing to disk.
 *
 * @param projectPath - Filesystem path to the project directory containing (or to contain) CLAUDE.md
 * @param rules - Parsed rules used to generate the CLAUDE.md constraints content
 * @param dryRun - If true, do not write changes to disk; return the computed result instead
 * @returns An EngineSyncResult with `path` set to the CLAUDE.md path, `content` containing the final
 * file contents, and `written` set to `true` if the file was written to disk, `false` for dry runs
 */
export function updateClaudeFile(
    projectPath: string,
    rules: ParsedRule[],
    dryRun: boolean = false
): EngineSyncResult {
    const claudePath = join(projectPath, 'CLAUDE.md');
    const rulesContent = generateClaudeContent(rules);
    let finalContent: string;

    if (existsSync(claudePath)) {
        // Read existing file
        const existingContent = readFileSync(claudePath, 'utf-8');

        // Try to replace the section between markers
        const replaced = replaceMarkerSection(
            existingContent,
            rulesContent,
            NEVER_SECTION_START,
            NEVER_SECTION_END
        );

        if (replaced !== null) {
            finalContent = replaced;
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

    return {
        path: claudePath,
        content: finalContent,
        written: !dryRun,
    };
}