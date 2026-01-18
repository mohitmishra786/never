#!/usr/bin/env tsx
/**
 * Validation script for rule files
 * Ensures all rules follow the correct format and conventions
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';

interface ValidationError {
    file: string;
    line?: number;
    message: string;
}

const errors: ValidationError[] = [];
const warnings: ValidationError[] = [];

/**
 * Validate YAML frontmatter
 */
function validateFrontmatter(file: string, frontmatter: any): void {
    if (!frontmatter.name) {
        errors.push({ file, message: 'Missing required field: name' });
    }
    
    if (!frontmatter.description) {
        errors.push({ file, message: 'Missing required field: description' });
    }
    
    if (!frontmatter.tags || !Array.isArray(frontmatter.tags)) {
        errors.push({ file, message: 'Missing or invalid field: tags (must be array)' });
    }
    
    if (!frontmatter.globs) {
        warnings.push({ file, message: 'Missing field: globs (optional but recommended)' });
    }
    
    if (frontmatter.alwaysApply === undefined) {
        warnings.push({ file, message: 'Missing field: alwaysApply (optional but recommended)' });
    }
}

/**
 * Validate rule content format
 */
function validateRuleContent(file: string, content: string): void {
    const lines = content.split('\n');
    
    // Check for required heading
    if (!content.includes('# ') && !content.includes('## ')) {
        errors.push({ file, message: 'Missing main heading (# or ##)' });
    }
    
    // Check for "Never" rules
    const neverRules = lines.filter(line => line.trim().startsWith('- **Never**'));
    const oldFormatRules = lines.filter(line => line.trim().startsWith('- Never') && !line.includes('**Never**'));
    
    if (neverRules.length === 0 && oldFormatRules.length === 0) {
        errors.push({ file, message: 'No rules found (must start with "- **Never**")' });
    }
    
    // Warn about old format
    if (oldFormatRules.length > 0) {
        warnings.push({ 
            file, 
            message: `Found ${oldFormatRules.length} rules using old format "- Never" instead of "- **Never**"` 
        });
    }
    
    // Check for proper semicolon usage in rules
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('- **Never**')) {
            // Rule should have format: - **Never** [action]; [justification]
            if (!line.includes(';')) {
                warnings.push({ 
                    file, 
                    line: i + 1, 
                    message: 'Rule missing semicolon separator between action and justification' 
                });
            }
        }
    }
}

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string, basePath: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...findMarkdownFiles(fullPath, basePath));
        } else if (entry.endsWith('.md')) {
            files.push(relative(basePath, fullPath));
        }
    }
    
    return files;
}

/**
 * Validate a single rule file
 */
function validateRuleFile(filePath: string, basePath: string): void {
    try {
        const content = readFileSync(join(basePath, filePath), 'utf-8');
        const parsed = matter(content);
        
        // Validate frontmatter
        validateFrontmatter(filePath, parsed.data);
        
        // Validate content
        validateRuleContent(filePath, parsed.content);
        
    } catch (error) {
        errors.push({ 
            file: filePath, 
            message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
    }
}

/**
 * Main validation function
 */
function validateRules(): void {
    const basePath = join(process.cwd(), 'packages', 'library');
    
    console.log(chalk.bold('Validating rule files...\n'));
    
    // Find all markdown files
    const files = findMarkdownFiles(basePath, basePath);
    
    console.log(`Found ${files.length} rule files\n`);
    
    // Validate each file
    for (const file of files) {
        validateRuleFile(file, basePath);
    }
    
    // Report results
    console.log(chalk.bold('\nValidation Results:'));
    console.log('='.repeat(50));
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log(chalk.green('\nAll rule files are valid!\n'));
        process.exit(0);
    }
    
    if (errors.length > 0) {
        console.log(chalk.red(`\nErrors: ${errors.length}`));
        for (const error of errors) {
            const location = error.line ? `:${error.line}` : '';
            console.log(chalk.red(`  ${error.file}${location}: ${error.message}`));
        }
    }
    
    if (warnings.length > 0) {
        console.log(chalk.yellow(`\nWarnings: ${warnings.length}`));
        for (const warning of warnings) {
            const location = warning.line ? `:${warning.line}` : '';
            console.log(chalk.yellow(`  ${warning.file}${location}: ${warning.message}`));
        }
    }
    
    console.log();
    
    if (errors.length > 0) {
        console.log(chalk.red('Validation failed. Please fix the errors above.\n'));
        process.exit(1);
    } else {
        console.log(chalk.green('Validation passed with warnings.\n'));
        process.exit(0);
    }
}

// Run validation
validateRules();
