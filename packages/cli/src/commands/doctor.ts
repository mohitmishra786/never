/**
 * `never doctor` command - Health check and diagnostics
 * Detects common issues like missing markers, registry problems, etc.
 */

import * as p from '@clack/prompts';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

const MARKER_START = '<!-- NEVER-RULES-START -->';
const MARKER_END = '<!-- NEVER-RULES-END -->';

interface HealthCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    fix?: string;
}

/**
 * Check if file has markers
 */
function checkMarkers(filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    const content = readFileSync(filePath, 'utf-8');
    return content.includes(MARKER_START) && content.includes(MARKER_END);
}

/**
 * Check for corporate proxy/registry issues
 */
function checkRegistry(): HealthCheck {
    try {
        // Try to access npmjs.org registry
        const registry = execSync('npm config get registry', { encoding: 'utf-8' }).trim();
        
        // Check if using a corporate registry
        if (!registry.includes('registry.npmjs.org') && !registry.includes('registry.yarnpkg.com')) {
            return {
                name: 'NPM Registry',
                status: 'warn',
                message: `Using custom registry: ${registry}`,
                fix: 'Corporate registries may block @mohitmishra7 scope. Try: npm config set registry https://registry.npmjs.org/',
            };
        }

        // Check for Artifactory or corporate proxy indicators
        if (registry.includes('artifactory') || registry.includes('nexus') || registry.includes('jfrog')) {
            return {
                name: 'NPM Registry',
                status: 'warn',
                message: `Corporate registry detected: ${registry}`,
                fix: 'If you encounter 404 errors, use --local-only flag or set up .npmrc with proper auth',
            };
        }

        return {
            name: 'NPM Registry',
            status: 'pass',
            message: 'Using standard npmjs.org registry',
        };
    } catch (error) {
        return {
            name: 'NPM Registry',
            status: 'warn',
            message: 'Could not determine registry configuration',
            fix: 'Run: npm config get registry',
        };
    }
}

/**
 * Check for .npmrc auth issues
 */
function checkNpmAuth(): HealthCheck {
    const npmrcPath = join(process.env.HOME || '~', '.npmrc');
    
    if (existsSync(npmrcPath)) {
        const content = readFileSync(npmrcPath, 'utf-8');
        
        // Check for always-auth warnings
        if (content.includes('always-auth=true')) {
            return {
                name: 'NPM Auth Config',
                status: 'warn',
                message: 'always-auth=true detected in .npmrc',
                fix: 'This is harmless but may cause auth warnings. Consider removing if not needed for private packages.',
            };
        }
    }

    return {
        name: 'NPM Auth Config',
        status: 'pass',
        message: 'No auth issues detected',
    };
}

/**
 * Check for instruction files
 */
function checkInstructionFiles(projectPath: string): HealthCheck[] {
    const checks: HealthCheck[] = [];
    const configPath = join(projectPath, '.never', 'config.yaml');

    // Check if Never is initialized
    if (!existsSync(configPath)) {
        checks.push({
            name: 'Never Config',
            status: 'fail',
            message: 'Never not initialized in this project',
            fix: 'Run: never init',
        });
        return checks;
    }

    // Check for CLAUDE.md
    const claudePath = join(projectPath, 'CLAUDE.md');
    if (existsSync(claudePath)) {
        const hasMarkers = checkMarkers(claudePath);
        checks.push({
            name: 'CLAUDE.md',
            status: hasMarkers ? 'pass' : 'warn',
            message: hasMarkers ? 'Found with markers' : 'Found but missing markers',
            fix: hasMarkers ? undefined : 'Run: never sync',
        });
    } else {
        checks.push({
            name: 'CLAUDE.md',
            status: 'warn',
            message: 'Not found',
            fix: 'Create CLAUDE.md or run: never init',
        });
    }

    // Check for .cursorrules
    const cursorRulesPath = join(projectPath, '.cursorrules');
    if (existsSync(cursorRulesPath)) {
        const hasMarkers = checkMarkers(cursorRulesPath);
        checks.push({
            name: '.cursorrules',
            status: hasMarkers ? 'pass' : 'warn',
            message: hasMarkers ? 'Found with markers' : 'Found but missing markers',
            fix: hasMarkers ? undefined : 'Run: never sync',
        });
    }

    // Check for .cursor/rules directory
    const cursorRulesDir = join(projectPath, '.cursor', 'rules');
    if (existsSync(cursorRulesDir)) {
        checks.push({
            name: 'Cursor Rules Dir',
            status: 'pass',
            message: 'Found .cursor/rules directory',
        });
    }

    return checks;
}

/**
 * Check for .gitignore configuration
 */
function checkGitignore(projectPath: string): HealthCheck {
    const gitignorePath = join(projectPath, '.gitignore');
    
    if (!existsSync(gitignorePath)) {
        return {
            name: '.gitignore',
            status: 'warn',
            message: 'No .gitignore found',
            fix: 'Create .gitignore to ensure Never backups are ignored',
        };
    }

    const content = readFileSync(gitignorePath, 'utf-8');
    const hasNeverBackups = content.includes('.never/backups') || content.includes('.never/');
    
    return {
        name: '.gitignore',
        status: hasNeverBackups ? 'pass' : 'warn',
        message: hasNeverBackups ? 'Never backups are ignored' : 'Never backups not in .gitignore',
        fix: hasNeverBackups ? undefined : 'Add ".never/backups/" to .gitignore',
    };
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): HealthCheck {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major < 18) {
        return {
            name: 'Node.js Version',
            status: 'fail',
            message: `Node.js ${version} is too old`,
            fix: 'Upgrade to Node.js 18 or higher',
        };
    }

    return {
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${version}`,
    };
}

/**
 * Main doctor command
 */
export async function doctorCommand(): Promise<void> {
    console.clear();
    p.intro(chalk.bold.blue('🩺 Never Health Check'));

    const projectPath = process.cwd();
    const checks: HealthCheck[] = [];

    // Run all checks
    checks.push(checkNodeVersion());
    checks.push(checkRegistry());
    checks.push(checkNpmAuth());
    checks.push(...checkInstructionFiles(projectPath));
    checks.push(checkGitignore(projectPath));

    // Display results
    console.log('\n');
    for (const check of checks) {
        const icon = check.status === 'pass' ? chalk.green('✓') : 
                     check.status === 'warn' ? chalk.yellow('⚠') : 
                     chalk.red('✗');
        
        console.log(`${icon} ${chalk.bold(check.name)}: ${check.message}`);
        
        if (check.fix) {
            console.log(`  ${chalk.dim('→ Fix:')} ${chalk.cyan(check.fix)}`);
        }
        console.log('');
    }

    // Summary
    const passed = checks.filter(c => c.status === 'pass').length;
    const warned = checks.filter(c => c.status === 'warn').length;
    const failed = checks.filter(c => c.status === 'fail').length;

    console.log(chalk.dim('─'.repeat(60)));
    console.log(`\n${chalk.bold('Summary:')} ${chalk.green(`${passed} passed`)} · ${chalk.yellow(`${warned} warnings`)} · ${chalk.red(`${failed} failed`)}\n`);

    if (failed > 0) {
        p.outro(chalk.red('❌ Critical issues found. Please fix the errors above.'));
        process.exit(1);
    } else if (warned > 0) {
        p.outro(chalk.yellow('⚠️  Some issues detected. Review the warnings above.'));
    } else {
        p.outro(chalk.green('✅ Everything looks good!'));
    }
}

export default doctorCommand;
