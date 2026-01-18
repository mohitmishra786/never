/**
 * `never scan` command
 * Auto-detect the tech stack and recommend rule packs
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import type { ScanResult } from '../schema.js';

interface ScanOptions {
    json?: boolean;
    verbose?: boolean;
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
 * Identify programming languages present in a project directory.
 *
 * @param projectPath - Path to the project root directory to scan for language indicators.
 * @returns Array of detected language identifiers such as `typescript`, `javascript`, `python`, `rust`, `go`, `java`, `ruby`, or `php`.
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
 * Detect JavaScript/Node frameworks declared in a project's package.json.
 *
 * Parses dependencies and devDependencies to identify frameworks and tools
 * (for example: React, Next.js, Vue, Nuxt, Angular, Svelte, Express, Fastify,
 * NestJS, Jest, Vitest, Mocha, Webpack, Vite, Esbuild, Tailwind).
 *
 * @returns An array of detected framework identifiers; empty if none are found or if package.json is missing or cannot be parsed.
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
 * Detects Python frameworks and common Python libraries referenced in a project directory.
 *
 * @param projectPath - Path to the project's root directory
 * @returns A deduplicated array of detected identifiers (for example: `django`, `flask`, `fastapi`, `pytest`, `numpy`, `pandas`, `ml`); empty if none are found
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
 * Detects development and auxiliary tooling present in a project directory.
 *
 * Checks for common tooling including AI-assisted tools, version control, containerization,
 * CI/CD workflows, and linters/formatters and returns identifiers for each tool found.
 *
 * @param projectPath - Path to the project root to scan
 * @returns An array of tool identifiers found in the project (for example: `git`, `docker`, `github-actions`, `gitlab-ci`, `eslint`, `prettier`, `cursor`, `claude`, `copilot`)
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

    // Linters/Formatters
    if (existsSync(join(projectPath, '.eslintrc.js')) || existsSync(join(projectPath, '.eslintrc.json')) || existsSync(join(projectPath, 'eslint.config.js'))) {
        tools.push('eslint');
    }
    if (existsSync(join(projectPath, '.prettierrc')) || existsSync(join(projectPath, 'prettier.config.js'))) {
        tools.push('prettier');
    }

    return tools;
}

/**
 * Selects recommended rule pack identifiers based on detected languages and frameworks.
 *
 * @param languages - Detected language identifiers (e.g., `typescript`, `python`)
 * @param frameworks - Detected framework identifiers (e.g., `react`, `django`)
 * @returns An array of recommended pack identifiers including `core` and any language- or framework-specific packs; duplicates are removed
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
 * Scan a project directory to detect its languages, frameworks, tools, and recommended rule packs.
 *
 * @param projectPath - Filesystem path to the project root to scan
 * @returns An object with the scan results:
 *  - `frameworks`: detected frameworks in the project
 *  - `languages`: detected programming languages
 *  - `tools`: detected development tools and infrastructure (CI, Docker, VCS, AI tools, linters, etc.)
 *  - `recommendedPacks`: identifiers of recommended rule packs based on detected languages and frameworks
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
 * Scan the current working directory and print detected languages, frameworks, tools, and recommended rule packs.
 *
 * When `options.json` is true, emits the scan result as JSON to stdout. Otherwise prints a formatted, human-readable
 * summary. When `options.verbose` is true, prints additional guidance lines.
 *
 * @param options - Scan options
 * @param options.json - If true, output the full ScanResult as JSON instead of formatted text
 * @param options.verbose - If true, include extra informational hints in the output
 */
export async function scanCommand(options: ScanOptions): Promise<void> {
    const projectPath = process.cwd();
    const verbose = options.verbose || false;

    console.log(chalk.bold('Scanning project...\\n'));

    const result = scanProject(projectPath);

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    // Display results
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

    if (verbose) {
        console.log();
        console.log(chalk.dim('Run `never init` to create a config with these packs'));
        console.log(chalk.dim('Run `never sync` to generate constraint files'));
    }
}