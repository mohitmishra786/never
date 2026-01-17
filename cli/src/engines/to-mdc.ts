/**
 * Cursor .mdc format converter
 * Generates .cursor/rules/*.mdc files with proper frontmatter
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import type { ParsedRule } from './parser.js';

export interface MdcOutput {
    filename: string;
    content: string;
}

/**
 * Safely serialize frontmatter values for YAML
 */
function serializeFrontmatter(frontmatter: {
    description: string;
    globs: string;
    alwaysApply: boolean;
}): string {
    // Use YAML library to properly escape values
    const yamlContent = YAML.stringify(frontmatter, {
        indent: 2,
        lineWidth: 0,
    }).trim();

    return `---\n${yamlContent}\n---`;
}

/**
 * Convert a single rule to Cursor .mdc format
 */
export function ruleToMdc(rule: ParsedRule): MdcOutput {
    const { frontmatter, content, filename } = rule;

    // Create the .mdc frontmatter with proper YAML escaping
    const mdcFrontmatter = serializeFrontmatter({
        description: frontmatter.description,
        globs: frontmatter.globs,
        alwaysApply: frontmatter.alwaysApply,
    });

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

    // Collect unique glob patterns from all rules
    const uniqueGlobs = [...new Set(rules.map(r => r.frontmatter.globs).filter(Boolean))];
    const globs = uniqueGlobs.length > 0 ? uniqueGlobs.join(',') : '**/*';

    const mdcFrontmatter = serializeFrontmatter({
        description,
        globs,
        alwaysApply: true,
    });

    return {
        filename: `${categoryName}.mdc`,
        content: `${mdcFrontmatter}\n${combinedContent}`,
    };
}
