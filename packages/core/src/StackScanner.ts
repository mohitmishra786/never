/**
 * StackScanner - Deep project type detection and rule suggestion
 * Scans for tech stacks and recommends appropriate Never rule packs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

interface Ignore {
    add(patterns: string | readonly string[]): Ignore;
    ignores(pathname: string): boolean;
}

// Load ignore package - will work in both ESM and CommonJS after compilation
function loadIgnoreModule(): (options?: any) => Ignore {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ignoreModule = require('ignore');
        return typeof ignoreModule === 'function' ? ignoreModule : ignoreModule.default;
    } catch (error) {
        // Fallback if ignore is not available
        console.warn('ignore package not available, .gitignore will not be respected');
        return () => ({
            add: function(this: Ignore) { return this; },
            ignores: () => false
        }) as Ignore;
    }
}

export interface ProjectInfo {
    hasTypeScript: boolean;
    hasPython: boolean;
    hasReact: boolean;
    hasVue: boolean;
    hasAngular: boolean;
    hasNode: boolean;
    hasCursor: boolean;
    hasEnvFiles: boolean;
    hasComponents: boolean;
    hasTests: boolean;
    hasDocker: boolean;
    hasCI: boolean;
    frameworks: string[];
    stacks: StackInfo[];
}

export interface DetectOptions {
    maxDepth?: number; // Maximum directory depth to scan (default: 3)
    useCache?: boolean; // Use cached results if available (default: true)
}

// Cache for detection results
const detectionCache = new Map<string, { result: ProjectInfo; timestamp: number; configHash: string }>();
const CACHE_TTL = 60000; // 1 minute cache TTL

/**
 * Clear detection cache - useful for testing
 */
export function clearDetectionCache(): void {
    detectionCache.clear();
}

export interface StackInfo {
    name: string;
    type: 'language' | 'framework' | 'tool' | 'security';
    ruleCount: number;
}

/**
 * Load .gitignore patterns using the ignore package
 */
function loadGitignore(projectPath: string): Ignore {
    const ignore = loadIgnoreModule();
    const ig = ignore();
    
    // Always ignore common directories
    ig.add([
        'node_modules/',
        '.git/',
        'dist/',
        'build/',
        '.next/',
        '.cache/',
        'coverage/',
        '.turbo/',
        '.never/backups/',
    ]);

    const gitignorePath = join(projectPath, '.gitignore');
    if (existsSync(gitignorePath)) {
        try {
            const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
            ig.add(gitignoreContent);
        } catch (error) {
            console.warn('Warning: Could not read .gitignore:', error);
        }
    }

    return ig;
}

/**
 * Check if a path should be ignored based on .gitignore rules
 */
function shouldIgnore(ig: Ignore, projectPath: string, filePath: string): boolean {
    const relativePath = relative(projectPath, filePath);
    return ig.ignores(relativePath);
}

/**
 * Generate a hash for config files to detect changes
 */
function getConfigHash(projectPath: string): string {
    const configFiles = [
        'package.json',
        'tsconfig.json',
        'requirements.txt',
        'pyproject.toml',
        '.never/config.yaml'
    ];
    
    const mtimes: number[] = [];
    for (const file of configFiles) {
        const filePath = join(projectPath, file);
        if (existsSync(filePath)) {
            try {
                const stat = statSync(filePath);
                mtimes.push(stat.mtimeMs);
            } catch {
                // Ignore stat errors
            }
        }
    }
    
    return mtimes.join(':');
}

/**
 * Check if cached result is still valid
 */
function getCachedResult(projectPath: string): ProjectInfo | null {
    const cached = detectionCache.get(projectPath);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Check if cache is expired
    if (age > CACHE_TTL) {
        detectionCache.delete(projectPath);
        return null;
    }
    
    // Check if config files have changed
    const currentHash = getConfigHash(projectPath);
    if (currentHash !== cached.configHash) {
        detectionCache.delete(projectPath);
        return null;
    }
    
    return cached.result;
}

/**
 * Comprehensive project detection with deep inspection
 * Now respects .gitignore and uses depth-limited scanning for performance
 */
export function detectProject(projectPath: string = process.cwd(), options: DetectOptions = {}): ProjectInfo {
    const maxDepth = options.maxDepth ?? 3; // Default to 3 levels deep
    const useCache = options.useCache ?? true;
    
    // Check cache first
    if (useCache) {
        const cached = getCachedResult(projectPath);
        if (cached) {
            return cached;
        }
    }
    const info: ProjectInfo = {
        hasTypeScript: false,
        hasPython: false,
        hasReact: false,
        hasVue: false,
        hasAngular: false,
        hasNode: false,
        hasCursor: false,
        hasEnvFiles: false,
        hasComponents: false,
        hasTests: false,
        hasDocker: false,
        hasCI: false,
        frameworks: [],
        stacks: [],
    };

    // Load .gitignore patterns
    const ig = loadGitignore(projectPath);

    // Check for TypeScript
    if (existsSync(join(projectPath, 'tsconfig.json'))) {
        info.hasTypeScript = true;
        info.frameworks.push('typescript');
        info.stacks.push({ name: 'TypeScript', type: 'language', ruleCount: 15 });
    }

    // Check for Python
    if (
        existsSync(join(projectPath, 'pyproject.toml')) ||
        existsSync(join(projectPath, 'requirements.txt')) ||
        existsSync(join(projectPath, 'setup.py')) ||
        existsSync(join(projectPath, 'Pipfile'))
    ) {
        info.hasPython = true;
        info.frameworks.push('python');
        info.stacks.push({ name: 'Python', type: 'language', ruleCount: 12 });
    }

    // Check for Node.js / package.json
    const packageJsonPath = join(projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
        info.hasNode = true;

        try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
            };

            // Check for React
            if (allDeps['react'] || allDeps['next']) {
                info.hasReact = true;
                info.frameworks.push('react');
                info.stacks.push({ name: 'React', type: 'framework', ruleCount: 18 });
            }

            // Check for Vue
            if (allDeps['vue'] || allDeps['nuxt']) {
                info.hasVue = true;
                info.frameworks.push('vue');
                info.stacks.push({ name: 'Vue', type: 'framework', ruleCount: 10 });
            }

            // Check for Angular
            if (allDeps['@angular/core']) {
                info.hasAngular = true;
                info.frameworks.push('angular');
                info.stacks.push({ name: 'Angular', type: 'framework', ruleCount: 10 });
            }
        } catch {
            // Ignore parse errors
        }
    }

    // Check for Cursor
    if (existsSync(join(projectPath, '.cursor'))) {
        info.hasCursor = true;
    }

    // Deep Inspection: Check for .env files (Security rules)
    // Note: .env files are typically not in .gitignore for template purposes
    const envPatterns = ['.env', '.env.local', '.env.development', '.env.production'];
    for (const pattern of envPatterns) {
        const envPath = join(projectPath, pattern);
        if (existsSync(envPath) && !shouldIgnore(ig, projectPath, envPath)) {
            info.hasEnvFiles = true;
            info.stacks.push({ name: 'Environment Config', type: 'security', ruleCount: 8 });
            break;
        }
    }

    // Deep Inspection: Check for src/components (Frontend rules)
    // Only check up to maxDepth to avoid performance issues in large repos
    const componentPaths = [
        join(projectPath, 'src', 'components'),
        join(projectPath, 'app', 'components'),
        join(projectPath, 'components'),
    ];
    for (const compPath of componentPaths) {
        // Calculate depth using platform-aware path operations
        const relPath = relative(projectPath, compPath);
        const depth = relPath.split(sep).length;
        
        if (depth <= maxDepth && existsSync(compPath) && !shouldIgnore(ig, projectPath, compPath)) {
            info.hasComponents = true;
            if (!info.hasReact && !info.hasVue && !info.hasAngular) {
                info.stacks.push({ name: 'Frontend Components', type: 'framework', ruleCount: 12 });
            }
            break;
        }
    }

    // Deep Inspection: Check for tests directory (Testing rules)
    const testPaths = [
        join(projectPath, 'tests'),
        join(projectPath, 'test'),
        join(projectPath, '__tests__'),
        join(projectPath, 'spec'),
    ];
    for (const testPath of testPaths) {
        // Calculate depth using platform-aware path operations
        const relPath = relative(projectPath, testPath);
        const depth = relPath.split(sep).length;
        
        if (depth <= maxDepth && existsSync(testPath) && !shouldIgnore(ig, projectPath, testPath)) {
            info.hasTests = true;
            info.stacks.push({ name: 'Testing', type: 'tool', ruleCount: 6 });
            break;
        }
    }

    // Check for Docker (root level files)
    if (existsSync(join(projectPath, 'Dockerfile')) || existsSync(join(projectPath, 'docker-compose.yml'))) {
        info.hasDocker = true;
        info.stacks.push({ name: 'Docker', type: 'tool', ruleCount: 4 });
    }

    // Check for CI/CD (root and near-root level dirs/files)
    const githubWorkflows = join(projectPath, '.github', 'workflows');
    const gitlabCi = join(projectPath, '.gitlab-ci.yml');
    
    if ((existsSync(githubWorkflows) && !shouldIgnore(ig, projectPath, githubWorkflows)) || existsSync(gitlabCi)) {
        info.hasCI = true;
        info.stacks.push({ name: 'CI/CD', type: 'tool', ruleCount: 5 });
    }

    // Cache the result if caching is enabled
    if (useCache) {
        detectionCache.set(projectPath, {
            result: info,
            timestamp: Date.now(),
            configHash: getConfigHash(projectPath)
        });
    }

    return info;
}

/**
 * Suggest rule sets based on detected project info
 */
export function suggestRuleSets(info: ProjectInfo): string[] {
    const rules: string[] = ['core']; // Always include core rules

    if (info.hasTypeScript || info.hasNode) {
        rules.push('typescript');
    }

    if (info.hasPython) {
        rules.push('python');
    }

    if (info.hasReact) {
        rules.push('react');
    }

    if (info.hasVue) {
        rules.push('vue');
    }

    if (info.hasAngular) {
        rules.push('angular');
    }

    // Add security rules if .env files detected
    if (info.hasEnvFiles) {
        rules.push('security');
    }

    return [...new Set(rules)]; // Remove duplicates
}

/**
 * Generate a summary of detected stacks for display
 */
export function generateStackSummary(info: ProjectInfo): string {
    const stackCount = info.stacks.length;
    const totalRules = info.stacks.reduce((sum, stack) => sum + stack.ruleCount, 0);

    return `Found ${stackCount} stacks. Syncing ${totalRules} relevant nevers.`;
}

