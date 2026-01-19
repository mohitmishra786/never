/**
 * `never scan` command
 * Auto-detect the tech stack and recommend rule packs
 * 
 * Multi-stage pipeline:
 * - Stage 1 (Filesystem): Detect config files (.gitignore, tsconfig.json, tailwind.config.js)
 * - Stage 2 (Manifest): Parse package.json for dependencies
 * - Stage 3 (Source): Sample source files for import patterns
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { detectProject, suggestRuleSets, generateStackSummary, type ProjectInfo, type StackInfo, type ScanResult } from '@mohitmishra7/never-core';

interface ScanOptions {
    json?: boolean;
    verbose?: boolean;
}

/**
 * Stack Report - JSON-compatible output for consumption by other commands
 */
interface StackReport {
    version: string;
    timestamp: string;
    projectPath: string;
    stages: {
        filesystem: FilesystemStage;
        manifest: ManifestStage;
        source: SourceStage;
    };
    summary: {
        languages: string[];
        frameworks: string[];
        tools: string[];
        recommendedPacks: string[];
        ruleCount: number;
    };
}

interface FilesystemStage {
    configFiles: string[];
    hasGitignore: boolean;
    hasTsConfig: boolean;
    hasTailwind: boolean;
    hasDocker: boolean;
    hasCI: boolean;
}

interface ManifestStage {
    packageJson: boolean;
    dependencies: string[];
    devDependencies: string[];
    pyprojectToml: boolean;
    requirementsTxt: boolean;
}

interface SourceStage {
    sampledFiles: number;
    detectedImports: string[];
    patterns: string[];
}

interface PackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
}

interface PyProjectToml {
    project?: {
        dependencies?: string[];
    };
    tool?: {
        poetry?: {
            dependencies?: Record<string, string>;
        };
    };
}

/**
 * Detect programming languages in the project
 */
function detectLanguages(projectPath: string): string[] {
    const languages: string[] = [];

    // TypeScript
    if (existsSync(join(projectPath, 'tsconfig.json'))) {
        languages.push('typescript');
    }

    // JavaScript (if package.json exists but no tsconfig)
    if (existsSync(join(projectPath, 'package.json')) && !languages.includes('typescript')) {
        languages.push('javascript');
    }

    // Python
    if (
        existsSync(join(projectPath, 'pyproject.toml')) ||
        existsSync(join(projectPath, 'requirements.txt')) ||
        existsSync(join(projectPath, 'setup.py')) ||
        existsSync(join(projectPath, 'Pipfile'))
    ) {
        languages.push('python');
    }

    // Rust
    if (existsSync(join(projectPath, 'Cargo.toml'))) {
        languages.push('rust');
    }

    // Go
    if (existsSync(join(projectPath, 'go.mod'))) {
        languages.push('go');
    }

    // Java
    if (existsSync(join(projectPath, 'pom.xml')) || existsSync(join(projectPath, 'build.gradle'))) {
        languages.push('java');
    }

    // Ruby
    if (existsSync(join(projectPath, 'Gemfile'))) {
        languages.push('ruby');
    }

    // PHP
    if (existsSync(join(projectPath, 'composer.json'))) {
        languages.push('php');
    }

    return languages;
}

/**
 * Detect frameworks from package.json dependencies
 */
function detectNodeFrameworks(projectPath: string): string[] {
    const frameworks: string[] = [];
    const packageJsonPath = join(projectPath, 'package.json');

    if (!existsSync(packageJsonPath)) {
        return frameworks;
    }

    try {
        const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        // React ecosystem
        if (allDeps['react']) {
            frameworks.push('react');
        }
        if (allDeps['next']) {
            frameworks.push('nextjs');
        }

        // Vue ecosystem
        if (allDeps['vue']) {
            frameworks.push('vue');
        }
        if (allDeps['nuxt']) {
            frameworks.push('nuxt');
        }

        // Angular
        if (allDeps['@angular/core']) {
            frameworks.push('angular');
        }

        // Svelte
        if (allDeps['svelte']) {
            frameworks.push('svelte');
        }

        // Node.js backends
        if (allDeps['express']) {
            frameworks.push('express');
        }
        if (allDeps['fastify']) {
            frameworks.push('fastify');
        }
        if (allDeps['nestjs'] || allDeps['@nestjs/core']) {
            frameworks.push('nestjs');
        }

        // Testing
        if (allDeps['jest']) {
            frameworks.push('jest');
        }
        if (allDeps['vitest']) {
            frameworks.push('vitest');
        }
        if (allDeps['mocha']) {
            frameworks.push('mocha');
        }

        // Bundlers
        if (allDeps['webpack']) {
            frameworks.push('webpack');
        }
        if (allDeps['vite']) {
            frameworks.push('vite');
        }
        if (allDeps['esbuild']) {
            frameworks.push('esbuild');
        }

        // CSS frameworks
        if (allDeps['tailwindcss']) {
            frameworks.push('tailwind');
        }

    } catch {
        // Ignore parse errors
    }

    return frameworks;
}

/**
 * Detect Python frameworks
 */
function detectPythonFrameworks(projectPath: string): string[] {
    const frameworks: string[] = [];

    // Check requirements.txt
    const requirementsPath = join(projectPath, 'requirements.txt');
    if (existsSync(requirementsPath)) {
        try {
            const content = readFileSync(requirementsPath, 'utf-8').toLowerCase();
            if (content.includes('django')) frameworks.push('django');
            if (content.includes('flask')) frameworks.push('flask');
            if (content.includes('fastapi')) frameworks.push('fastapi');
            if (content.includes('pytest')) frameworks.push('pytest');
            if (content.includes('numpy')) frameworks.push('numpy');
            if (content.includes('pandas')) frameworks.push('pandas');
            if (content.includes('tensorflow') || content.includes('torch')) {
                frameworks.push('ml');
            }
        } catch {
            // Ignore read errors
        }
    }

    // Check pyproject.toml (simplified parsing)
    const pyprojectPath = join(projectPath, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
        try {
            const content = readFileSync(pyprojectPath, 'utf-8').toLowerCase();
            if (content.includes('django')) frameworks.push('django');
            if (content.includes('flask')) frameworks.push('flask');
            if (content.includes('fastapi')) frameworks.push('fastapi');
        } catch {
            // Ignore read errors
        }
    }

    return [...new Set(frameworks)]; // Remove duplicates
}

/**
 * Detect development tools
 */
function detectTools(projectPath: string): string[] {
    const tools: string[] = [];

    // AI tools
    if (existsSync(join(projectPath, '.cursor'))) {
        tools.push('cursor');
    }
    if (existsSync(join(projectPath, 'CLAUDE.md'))) {
        tools.push('claude');
    }
    if (existsSync(join(projectPath, '.github', 'copilot'))) {
        tools.push('copilot');
    }

    // Version control
    if (existsSync(join(projectPath, '.git'))) {
        tools.push('git');
    }

    // Docker
    if (existsSync(join(projectPath, 'Dockerfile')) || existsSync(join(projectPath, 'docker-compose.yml'))) {
        tools.push('docker');
    }

    // CI/CD
    if (existsSync(join(projectPath, '.github', 'workflows'))) {
        tools.push('github-actions');
    }
    if (existsSync(join(projectPath, '.gitlab-ci.yml'))) {
        tools.push('gitlab-ci');
    }

    // Linters/Formatters - check all ESLint config variants
    const eslintConfigs = [
        '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc',
        'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs'
    ];
    if (eslintConfigs.some(cfg => existsSync(join(projectPath, cfg)))) {
        tools.push('eslint');
    }
    if (existsSync(join(projectPath, '.prettierrc')) || existsSync(join(projectPath, 'prettier.config.js'))) {
        tools.push('prettier');
    }

    return tools;
}

/**
 * Map detected items to recommended rule packs
 */
function getRecommendedPacks(languages: string[], frameworks: string[]): string[] {
    const packs: string[] = ['core']; // Always include core

    // Language packs
    if (languages.includes('typescript') || languages.includes('javascript')) {
        packs.push('typescript');
    }
    if (languages.includes('python')) {
        packs.push('python');
    }
    if (languages.includes('rust')) {
        packs.push('rust');
    }
    if (languages.includes('go')) {
        packs.push('go');
    }

    // Framework packs
    if (frameworks.includes('react') || frameworks.includes('nextjs')) {
        packs.push('react');
    }
    if (frameworks.includes('vue') || frameworks.includes('nuxt')) {
        packs.push('vue');
    }
    if (frameworks.includes('angular')) {
        packs.push('angular');
    }
    if (frameworks.includes('django') || frameworks.includes('flask') || frameworks.includes('fastapi')) {
        packs.push('python-web');
    }

    return [...new Set(packs)];
}

/**
 * Stage 3: Sample source files for import patterns
 */
function sampleSourceFiles(projectPath: string): SourceStage {
    const result: SourceStage = {
        sampledFiles: 0,
        detectedImports: [],
        patterns: [],
    };

    const srcDir = join(projectPath, 'src');
    if (!existsSync(srcDir)) {
        return result;
    }

    const importPatterns = new Set<string>();
    const codePatterns = new Set<string>();

    // Sample up to 5 files
    const files: string[] = [];
    const collectFiles = (dir: string, depth: number = 0): void => {
        if (depth > 2 || files.length >= 5) return;
        try {
            const entries = readdirSync(dir);
            for (const entry of entries) {
                if (files.length >= 5) break;
                const fullPath = join(dir, entry);
                const stat = statSync(fullPath);
                if (stat.isFile() && /\.(ts|tsx|js|jsx|py)$/.test(entry)) {
                    files.push(fullPath);
                } else if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                    collectFiles(fullPath, depth + 1);
                }
            }
        } catch {
            // Ignore errors
        }
    };

    collectFiles(srcDir);
    result.sampledFiles = files.length;

    // Analyze first 5 lines of each file
    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n').slice(0, 5);

            for (const line of lines) {
                // Detect React imports
                if (line.includes("from 'react'") || line.includes('from "react"')) {
                    importPatterns.add('react');
                }
                // Detect Next.js imports
                if (line.includes("from 'next") || line.includes('from "next')) {
                    importPatterns.add('nextjs');
                }
                // Detect Vue imports
                if (line.includes("from 'vue'") || line.includes('from "vue"')) {
                    importPatterns.add('vue');
                }
                // Detect Express imports
                if (line.includes("from 'express'") || line.includes('require("express")')) {
                    importPatterns.add('express');
                }
                // Detect TypeScript patterns
                if (line.includes(': React.FC') || line.includes('interface ') || line.includes('type ')) {
                    codePatterns.add('typescript-strict');
                }
                // Detect hooks usage
                if (line.includes('useState') || line.includes('useEffect')) {
                    codePatterns.add('react-hooks');
                }
            }
        } catch {
            // Ignore read errors
        }
    }

    result.detectedImports = Array.from(importPatterns);
    result.patterns = Array.from(codePatterns);
    return result;
}

/**
 * Perform a complete multi-stage project scan
 */
export function scanProject(projectPath: string): ScanResult {
    const languages = detectLanguages(projectPath);
    const nodeFrameworks = detectNodeFrameworks(projectPath);
    const pythonFrameworks = detectPythonFrameworks(projectPath);
    const frameworks = [...nodeFrameworks, ...pythonFrameworks];
    const tools = detectTools(projectPath);
    const recommendedPacks = getRecommendedPacks(languages, frameworks);

    return {
        frameworks,
        languages,
        tools,
        recommendedPacks,
    };
}

/**
 * Generate full Stack Report with all stages
 */
export function generateStackReport(projectPath: string): StackReport {
    const languages = detectLanguages(projectPath);
    const nodeFrameworks = detectNodeFrameworks(projectPath);
    const pythonFrameworks = detectPythonFrameworks(projectPath);
    const frameworks = [...nodeFrameworks, ...pythonFrameworks];
    const tools = detectTools(projectPath);
    const recommendedPacks = getRecommendedPacks(languages, frameworks);
    const sourceStage = sampleSourceFiles(projectPath);

    // Stage 1: Filesystem
    const configFiles: string[] = [];
    const checkConfigs = [
        'tsconfig.json', 'package.json', '.gitignore', 'tailwind.config.js',
        'tailwind.config.ts', 'next.config.js', 'vite.config.ts', 'webpack.config.js'
    ];
    for (const cfg of checkConfigs) {
        if (existsSync(join(projectPath, cfg))) {
            configFiles.push(cfg);
        }
    }

    // Stage 2: Manifest
    let dependencies: string[] = [];
    let devDependencies: string[] = [];
    const packageJsonPath = join(projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            dependencies = Object.keys(pkg.dependencies || {});
            devDependencies = Object.keys(pkg.devDependencies || {});
        } catch {
            // Ignore parse errors
        }
    }

    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        projectPath,
        stages: {
            filesystem: {
                configFiles,
                hasGitignore: existsSync(join(projectPath, '.gitignore')),
                hasTsConfig: existsSync(join(projectPath, 'tsconfig.json')),
                hasTailwind: existsSync(join(projectPath, 'tailwind.config.js')) || 
                             existsSync(join(projectPath, 'tailwind.config.ts')),
                hasDocker: existsSync(join(projectPath, 'Dockerfile')),
                hasCI: existsSync(join(projectPath, '.github', 'workflows')),
            },
            manifest: {
                packageJson: existsSync(packageJsonPath),
                dependencies,
                devDependencies,
                pyprojectToml: existsSync(join(projectPath, 'pyproject.toml')),
                requirementsTxt: existsSync(join(projectPath, 'requirements.txt')),
            },
            source: sourceStage,
        },
        summary: {
            languages,
            frameworks,
            tools,
            recommendedPacks,
            ruleCount: recommendedPacks.length * 10, // Estimate
        },
    };
}

/**
 * Main scan command handler
 */
export async function scanCommand(options: ScanOptions): Promise<void> {
    const projectPath = process.cwd();
    const verbose = options.verbose || false;

    console.log(chalk.bold('Scanning project...\n'));

    // Use full Stack Report for JSON output
    if (options.json) {
        const report = generateStackReport(projectPath);
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    const result = scanProject(projectPath);

    // Display results with stage information
    if (verbose) {
        console.log(chalk.dim('Stage 1: Filesystem analysis...'));
        console.log(chalk.dim('Stage 2: Manifest parsing...'));
        console.log(chalk.dim('Stage 3: Source sampling...'));
        console.log();
    }

    console.log(chalk.blue('📋 Detected Languages:'));
    if (result.languages.length > 0) {
        for (const lang of result.languages) {
            console.log(`   ${chalk.green('•')} ${lang}`);
        }
    } else {
        console.log(chalk.gray('   No languages detected'));
    }

    console.log();
    console.log(chalk.blue('🔧 Detected Frameworks:'));
    if (result.frameworks.length > 0) {
        for (const framework of result.frameworks) {
            console.log(`   ${chalk.green('•')} ${framework}`);
        }
    } else {
        console.log(chalk.gray('   No frameworks detected'));
    }

    console.log();
    console.log(chalk.blue('🛠️  Detected Tools:'));
    if (result.tools.length > 0) {
        for (const tool of result.tools) {
            console.log(`   ${chalk.green('•')} ${tool}`);
        }
    } else {
        console.log(chalk.gray('   No tools detected'));
    }

    console.log();
    console.log(chalk.bold.yellow('📦 Recommended Rule Packs:'));
    for (const pack of result.recommendedPacks) {
        console.log(`   ${chalk.cyan('→')} ${pack}`);
    }

    console.log();
    console.log(chalk.dim('Run `never init` to create a config with these packs'));
    console.log(chalk.dim('Run `never scan --json` for machine-readable output'));
}
