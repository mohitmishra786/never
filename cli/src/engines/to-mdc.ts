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
    category?: string;
}

/**
 * Category mappings for generating never-{category}.mdc files
 */
const CATEGORY_MAP: Record<string, { name: string; tags: string[]; globs: string }> = {
    typescript: { name: 'TypeScript', tags: ['typescript', 'javascript', 'node'], globs: '**/*.{ts,tsx,js,jsx}' },
    security: { name: 'Security', tags: ['security', 'secrets'], globs: '**/*' },
    react: { name: 'React', tags: ['react', 'frontend'], globs: '**/*.{tsx,jsx}' },
    python: { name: 'Python', tags: ['python'], globs: '**/*.py' },
    core: { name: 'Core', tags: ['core', 'general'], globs: '**/*' },
    testing: { name: 'Testing', tags: ['testing', 'test'], globs: '**/*.{test,spec}.{ts,tsx,js,jsx}' },
};

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
        category: categoryName,
    };
}

/**
 * Generate category-specific .mdc files (never-ts.mdc, never-security.mdc, etc.)
 */
export function generateCategoryMdcFiles(rules: ParsedRule[]): MdcOutput[] {
    const outputs: MdcOutput[] = [];
    const categorizedRules = new Map<string, ParsedRule[]>();

    // Group rules by matching category
    for (const rule of rules) {
        const tags = rule.frontmatter.tags || [];
        const ruleCategory = rule.id.split('/')[0]; // e.g., "core/safety" -> "core"

        // Check which categories this rule belongs to
        for (const [category, config] of Object.entries(CATEGORY_MAP)) {
            const matchesTags = config.tags.some(tag =>
                tags.includes(tag) || ruleCategory.includes(tag)
            );

            if (matchesTags || category === ruleCategory) {
                if (!categorizedRules.has(category)) {
                    categorizedRules.set(category, []);
                }
                categorizedRules.get(category)!.push(rule);
            }
        }
    }

    // Generate .mdc file for each category
    for (const [category, categoryRules] of categorizedRules) {
        if (categoryRules.length === 0) continue;

        const config = CATEGORY_MAP[category];
        if (!config) continue;

        // Collect all individual rules from the parsed rules
        const allRuleTexts: string[] = [];
        for (const rule of categoryRules) {
            for (const ruleText of rule.rules) {
                allRuleTexts.push(`- ${ruleText}`);
            }
        }

        const content = `# Never - ${config.name} Rules

These constraints are automatically synced by [Never CLI](https://github.com/mohitmishra786/never).

## Constraints

${allRuleTexts.join('\n')}
`;

        const mdcFrontmatter = serializeFrontmatter({
            description: `Never constraints for ${config.name}`,
            globs: config.globs,
            alwaysApply: false,
        });

        outputs.push({
            filename: `never-${category}.mdc`,
            content: `${mdcFrontmatter}\n\n${content}`,
            category,
        });
    }

    return outputs;
}

/**
 * Write category-specific .mdc files to .cursor/rules/
 */
export function writeCategoryMdcFiles(
    projectPath: string,
    rules: ParsedRule[],
    dryRun: boolean = false
): string[] {
    const outputs = generateCategoryMdcFiles(rules);
    return writeMdcFiles(projectPath, outputs, dryRun);
}

