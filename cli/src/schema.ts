/**
 * Rule Schema Definitions
 * Zod-based schemas for Never rule validation and type safety
 */

import { z } from 'zod';

/**
 * Rule categories for classification
 */
export const RuleCategorySchema = z.enum([
    'security',
    'style',
    'logic',
    'workflow',
    'quality',
    'core',
]);

/**
 * Severity levels for rules
 */
export const RuleSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Individual rule within a rule file
 */
export const RuleItemSchema = z.object({
    id: z.string().describe('Unique identifier for the rule'),
    category: RuleCategorySchema.describe('Category this rule belongs to'),
    tags: z.array(z.string()).describe('Tags for filtering and grouping'),
    content: z.string().describe('The markdown "Never" constraint text'),
    triggers: z.array(z.string()).describe('Glob patterns that trigger this rule'),
    severity: RuleSeveritySchema.optional().default('warning'),
});

/**
 * Frontmatter schema for rule markdown files
 */
export const RuleFrontmatterSchema = z.object({
    name: z.string().describe('Human-readable rule category name'),
    description: z.string().describe('Brief explanation of what this category covers'),
    category: RuleCategorySchema.optional().describe('Primary category for the rule set'),
    tags: z.array(z.string()).default([]).describe('Tags for filtering'),
    globs: z.string().default('**/*').describe('File patterns where these rules apply'),
    alwaysApply: z.boolean().default(true).describe('Whether rules load regardless of file type'),
});

/**
 * Complete parsed rule file structure
 */
export const ParsedRuleSchema = z.object({
    id: z.string().describe('Unique identifier e.g., "core/safety"'),
    filename: z.string().describe('Source filename e.g., "safety.md"'),
    frontmatter: RuleFrontmatterSchema,
    content: z.string().describe('Markdown content without frontmatter'),
    rules: z.array(z.string()).describe('Individual "Never" rules extracted'),
    category: RuleCategorySchema.optional(),
});

/**
 * Rule set containing multiple parsed rules
 */
export const RuleSetSchema = z.object({
    name: z.string().describe('e.g., "core", "typescript", "react"'),
    rules: z.array(ParsedRuleSchema),
});

/**
 * Sync result for tracking generated files
 */
export const SyncResultSchema = z.object({
    path: z.string().describe('Path to the generated/updated file'),
    content: z.string().describe('Content that was written'),
    written: z.boolean().describe('Whether the file was actually written (false for dry-run)'),
    target: z.enum(['cursor', 'claude', 'agents', 'skill']).describe('Target platform'),
});

/**
 * Lint violation reported by the lint command
 */
export const LintViolationSchema = z.object({
    file: z.string().describe('File where violation was found'),
    line: z.number().optional().describe('Line number if applicable'),
    rule: z.string().describe('The rule that was violated'),
    ruleId: z.string().describe('Unique rule identifier'),
    severity: RuleSeveritySchema,
    message: z.string().describe('Description of the violation'),
});

/**
 * Scan result for tech stack detection
 */
export const ScanResultSchema = z.object({
    frameworks: z.array(z.string()).describe('Detected frameworks'),
    languages: z.array(z.string()).describe('Detected programming languages'),
    tools: z.array(z.string()).describe('Detected development tools'),
    recommendedPacks: z.array(z.string()).describe('Recommended rule packs'),
});

// Type exports
export type RuleCategory = z.infer<typeof RuleCategorySchema>;
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;
export type RuleItem = z.infer<typeof RuleItemSchema>;
export type RuleFrontmatter = z.infer<typeof RuleFrontmatterSchema>;
export type ParsedRule = z.infer<typeof ParsedRuleSchema>;
export type RuleSet = z.infer<typeof RuleSetSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;
export type LintViolation = z.infer<typeof LintViolationSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;

/**
 * Validate and parse a YAML-parsed frontmatter object into a RuleFrontmatter.
 *
 * @param data - The parsed frontmatter (typically the result of YAML parsing)
 * @returns The validated `RuleFrontmatter`
 * @throws {ZodError} If the provided data does not conform to the RuleFrontmatter schema
 */
export function validateFrontmatter(data: unknown): RuleFrontmatter {
    return RuleFrontmatterSchema.parse(data);
}

/**
 * Parse and validate the given value as a complete parsed rule.
 *
 * @param data - The input to validate (typically an object produced from a parsed rule file)
 * @returns The validated `ParsedRule` object
 */
export function validateParsedRule(data: unknown): ParsedRule {
    return ParsedRuleSchema.parse(data);
}

/**
 * Attempts to parse and validate frontmatter data.
 *
 * @param data - The input to validate as frontmatter
 * @returns The parsed `RuleFrontmatter` if validation succeeds, `null` otherwise
 */
export function safeParseFrontmatter(data: unknown): RuleFrontmatter | null {
    const result = RuleFrontmatterSchema.safeParse(data);
    return result.success ? result.data : null;
}