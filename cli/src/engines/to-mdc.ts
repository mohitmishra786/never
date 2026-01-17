/**
 * Cursor .mdc format converter
 * Generates .cursor/rules/*.mdc files with proper frontmatter
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ParsedRule } from './parser.js';

export interface MdcOutput {
    filename: string;
    content: string;
}

/**
 * Convert a single rule to Cursor .mdc format
 */
export function ruleToMdc(rule: ParsedRule): MdcOutput {
    const { frontmatter, content, filename } = rule;

    // Create the .mdc frontmatter
    const mdcFrontmatter = [
        '---',
        `description: ${frontmatter.description}`,
        `globs: ${frontmatter.globs}`,
        `alwaysApply: ${frontmatter.alwaysApply}`,
        '---',
    ].join('\n');

    // Combine frontmatter with content
    const mdcContent = `${mdcFrontmatter}\n\n${content.trim()}\n`;

    return {
        filename: filename.replace('.md', '.mdc'),
        content: mdcContent,
    };
}

/**
 * Convert multiple rules to individual .mdc files
 */
export function rulesToMdc(rules: ParsedRule[]): MdcOutput[] {
    return rules.map(rule => ruleToMdc(rule));
}

/**
 * Generate granular .mdc files - one per major rule category
 */
export function generateGranularMdc(rules: ParsedRule[]): MdcOutput[] {
    const outputs: MdcOutput[] = [];

    for (const rule of rules) {
        outputs.push(ruleToMdc(rule));
    }

    return outputs;
}

/**
 * Write .mdc files to the .cursor/rules/ directory
 */
export function writeMdcFiles(
    projectPath: string,
    mdcOutputs: MdcOutput[],
    dryRun: boolean = false
): string[] {
    const cursorRulesPath = join(projectPath, '.cursor', 'rules');
    const writtenFiles: string[] = [];

    if (!dryRun) {
        // Ensure directory exists
        if (!existsSync(cursorRulesPath)) {
            mkdirSync(cursorRulesPath, { recursive: true });
        }
    }

    for (const output of mdcOutputs) {
        const filePath = join(cursorRulesPath, output.filename);

        if (!dryRun) {
            writeFileSync(filePath, output.content, 'utf-8');
        }

        writtenFiles.push(filePath);
    }

    return writtenFiles;
}

/**
 * Create a combined .mdc file for a rule category
 */
export function createCombinedMdc(
    categoryName: string,
    rules: ParsedRule[],
    description: string
): MdcOutput {
    // Collect all rules content
    let combinedContent = '';

    for (const rule of rules) {
        combinedContent += `\n${rule.content.trim()}\n`;
    }

    // Determine the most appropriate glob pattern
    const globs = rules[0]?.frontmatter.globs || '**/*';

    const mdcFrontmatter = [
        '---',
        `description: ${description}`,
        `globs: ${globs}`,
        'alwaysApply: true',
        '---',
    ].join('\n');

    return {
        filename: `${categoryName}.mdc`,
        content: `${mdcFrontmatter}\n${combinedContent}`,
    };
}
