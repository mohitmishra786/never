/**
 * `never lint` command
 * Check current git diff against active "Nevers" and report violations
 */

import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { simpleGit } from 'simple-git';
import { minimatch } from 'minimatch';
import { loadConfig, getLibraryPath } from '../utils/config.js';
import { loadAllRuleSets, getRulesForSets } from '../engines/parser.js';
import type { LintViolation } from '../schema.js';
import type { ParsedRule } from '../engines/parser.js';

interface LintOptions {
    staged?: boolean;
    json?: boolean;
    verbose?: boolean;
    config?: string;
}

interface DiffFile {
    file: string;
    additions: string[];
    lineNumbers: number[];
}

/**
 * Parse raw git diff text and extract per-file added lines with their line numbers.
 *
 * @param diffOutput - Raw output from `git diff` (or `git diff --cached`)
 * @returns An array of DiffFile entries for files that contain additions; each entry includes `file`, `additions` (the added line texts), and `lineNumbers` (the 1-based line numbers in the new file)
 */
function parseDiff(diffOutput: string): DiffFile[] {
    const files: DiffFile[] = [];
    const fileBlocks = diffOutput.split('diff --git');

    for (const block of fileBlocks) {
        if (!block.trim()) continue;

        // Extract filename
        const fileMatch = block.match(/a\/(.+?) b\//);
        if (!fileMatch) continue;

        const file = fileMatch[1];
        const additions: string[] = [];
        const lineNumbers: number[] = [];

        // Parse hunks for additions
        const lines = block.split('\n');
        let currentLine = 0;

        for (const line of lines) {
            // Track line numbers from hunk headers
            const hunkMatch = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (hunkMatch) {
                currentLine = parseInt(hunkMatch[1], 10) - 1;
                continue;
            }

            if (line.startsWith('+') && !line.startsWith('+++')) {
                currentLine++;
                additions.push(line.substring(1));
                lineNumbers.push(currentLine);
            } else if (!line.startsWith('-')) {
                currentLine++;
            }
        }

        if (additions.length > 0) {
            files.push({ file, additions, lineNumbers });
        }
    }

    return files;
}

/**
 * Determines whether a parsed rule should be considered for a given file path based on the rule's frontmatter.
 *
 * Checks the `alwaysApply` flag and the `globs` value (supports comma-separated patterns and the default `**/*`) to decide applicability.
 *
 * @param rule - The parsed rule whose frontmatter may contain `alwaysApply` and `globs`
 * @param filePath - The file path to test against the rule's glob patterns
 * @returns `true` if the rule applies to `filePath`, `false` otherwise
 */
function ruleAppliesToFile(rule: ParsedRule, filePath: string): boolean {
    const globs = rule.frontmatter.globs;
    if (rule.frontmatter.alwaysApply) return true;
    if (!globs || globs === '**/*') return true;

    // Handle comma-separated globs
    const patterns = globs.split(',').map(g => g.trim());
    return patterns.some(pattern => minimatch(filePath, pattern));
}

/**
 * Identify lint violations in diff additions based on active rules.
 *
 * Scans each added line in the provided diff files for patterns referenced by each rule's `rules` (the "never" entries).
 * Records one LintViolation per matching rule per line containing the file path, line number, rule text, rule id, severity, and message.
 *
 * @param diffFiles - List of changed files with their added lines and corresponding line numbers
 * @param rules - Parsed rule definitions to evaluate against the diff additions
 * @returns An array of `LintViolation` objects representing each detected violation
 */
function checkViolations(
    diffFiles: DiffFile[],
    rules: ParsedRule[]
): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const diffFile of diffFiles) {
        // Find applicable rules for this file
        const applicableRules = rules.filter(rule => ruleAppliesToFile(rule, diffFile.file));

        for (const rule of applicableRules) {
            for (const neverRule of rule.rules) {
                // Extract the core constraint from the rule text
                const lowerRule = neverRule.toLowerCase();

                // Check each addition for potential violations
                for (let i = 0; i < diffFile.additions.length; i++) {
                    const line = diffFile.additions[i].toLowerCase();
                    const lineNum = diffFile.lineNumbers[i];

                    // Common violation patterns
                    const violationPatterns: Array<{ pattern: RegExp; trigger: string }> = [
                        { pattern: /\bany\b/, trigger: 'use `any`' },
                        { pattern: /\beval\s*\(/, trigger: 'use eval' },
                        { pattern: /console\.(log|debug|info)\s*\(/, trigger: 'debugging statements' },
                        { pattern: /\/\/\s*todo/i, trigger: 'todo comments' },
                        { pattern: /\bvar\s+\w/, trigger: 'use `var`' },
                        { pattern: /\.then\s*\(/, trigger: 'then() chains' },
                        { pattern: /hardcoded|password\s*=\s*['"]/, trigger: 'hardcode' },
                        { pattern: /@ts-ignore/, trigger: 'ts-ignore' },
                        { pattern: /eslint-disable/, trigger: 'eslint-disable' },
                    ];

                    for (const { pattern, trigger } of violationPatterns) {
                        if (lowerRule.includes(trigger) && pattern.test(line)) {
                            violations.push({
                                file: diffFile.file,
                                line: lineNum,
                                rule: neverRule,
                                ruleId: rule.id,
                                severity: 'warning',
                                message: `Possible violation of: ${neverRule}`,
                            });
                            break; // One violation per rule per line
                        }
                    }
                }
            }
        }
    }

    return violations;
}

/**
 * Run linting of git changes against configured rule sets and report any violations.
 *
 * Loads the git diff (staged changes when requested), parses changed lines, loads the active rule sets
 * (defaults to `core` or uses the project's .never config), and evaluates the diff for rule violations.
 * Results are printed as human-readable grouped output by default or as JSON when `options.json` is set.
 * The command may terminate the process with a non-zero exit code on errors (e.g., not a git repo, missing rule
 * library, failure to read diff) or when violations are found (useful for CI).
 *
 * @param options - Configuration for the lint run. Recognized fields: `staged` (use staged/--cached diff),
 *   `json` (emit JSON output), `verbose` (print extra diagnostics), and `config` (path to a .never config file).
 */
export async function lintCommand(options: LintOptions): Promise<void> {
    const projectPath = process.cwd();
    const configPath = options.config || join(projectPath, '.never', 'config.yaml');
    const verbose = options.verbose || false;

    console.log(chalk.bold('Running Never lint...\\n'));

    // Initialize git
    const git = simpleGit(projectPath);

    // Check if this is a git repository
    const isGitRepo = await git.checkIsRepo();
    if (!isGitRepo) {
        console.error(chalk.red('Not a git repository. Lint requires git.'));
        process.exit(1);
    }

    // Get the diff
    let diffOutput: string;
    try {
        if (options.staged) {
            diffOutput = await git.diff(['--cached']);
        } else {
            diffOutput = await git.diff();
        }
    } catch (error) {
        console.error(chalk.red('Failed to get git diff:'), error);
        process.exit(1);
    }

    if (!diffOutput) {
        console.log(chalk.green('No changes to lint.'));
        return;
    }

    // Parse the diff
    const diffFiles = parseDiff(diffOutput);
    if (verbose) {
        console.log(`Found changes in ${diffFiles.length} file(s)\\n`);
    }

    // Load rules
    let ruleSets: string[] = ['core'];
    if (existsSync(configPath)) {
        const config = loadConfig(configPath);
        if (config) {
            ruleSets = config.rules;
        }
    }

    const libraryPath = getLibraryPath();
    if (!existsSync(libraryPath)) {
        console.error(chalk.red('Rule library not found.'));
        process.exit(1);
    }

    const allRuleSets = loadAllRuleSets(libraryPath);
    const activeRules = getRulesForSets(allRuleSets, ruleSets);

    if (verbose) {
        console.log(`Using ${activeRules.length} rule files from sets: ${ruleSets.join(', ')}\\n`);
    }

    // Check for violations
    const violations = checkViolations(diffFiles, activeRules);

    // Output results
    if (options.json) {
        console.log(JSON.stringify(violations, null, 2));
        return;
    }

    if (violations.length === 0) {
        console.log(chalk.green('✓ No violations found!'));
        return;
    }

    console.log(chalk.yellow(`Found ${violations.length} potential violation(s):\\n`));

    // Group by file
    const byFile = new Map<string, LintViolation[]>();
    for (const v of violations) {
        if (!byFile.has(v.file)) {
            byFile.set(v.file, []);
        }
        byFile.get(v.file)!.push(v);
    }

    for (const [file, fileViolations] of byFile) {
        console.log(chalk.cyan(`  ${file}`));
        for (const v of fileViolations) {
            const lineInfo = v.line ? `:${v.line}` : '';
            console.log(chalk.yellow(`    ⚠ ${file}${lineInfo}`));
            console.log(chalk.gray(`      ${v.rule}`));
        }
        console.log();
    }

    // Exit with error code if violations found (useful for CI)
    process.exit(1);
}