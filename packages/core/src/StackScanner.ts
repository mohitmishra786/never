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
            add: function (this: Ignore) { return this; },
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
 * Environment detection result for AI agent targets
 */
export interface EnvironmentInfo {
    /** Cursor IDE detected: .cursor/ OR .cursorrules OR TERM_PROGRAM=cursor */
    cursor: boolean;
    /** GitHub Copilot detected: .github/copilot-instructions.md OR .github/ exists AND not in Cursor */
    copilot: boolean;
    /** Claude Code detected: CLAUDE.md OR .claude/ directory */
    claude: boolean;
    /** Warnings about detected environment (e.g., multiple IDEs) */
    warnings: string[];
    /** Details about what triggered each detection */
    detectionDetails: {
        cursorReason?: string;
        copilotReason?: string;
        claudeReason?: string;
    };
}

/**
 * Detect AI coding environment with high precision
 * This is the "Detective Engine" for determining which IDE/agent is being used
 */
export function detectEnvironment(projectPath: string = process.cwd()): EnvironmentInfo {
    const info: EnvironmentInfo = {
        cursor: false,
        copilot: false,
        claude: false,
        warnings: [],
        detectionDetails: {},
    };

    // === CURSOR DETECTION ===
    // Priority 1: Environment variable (most reliable in-IDE indicator)
    if (process.env.TERM_PROGRAM === 'cursor') {
        info.cursor = true;
        info.detectionDetails.cursorReason = 'TERM_PROGRAM=cursor environment variable';
    }
    // Priority 2: .cursor directory exists
    else if (existsSync(join(projectPath, '.cursor'))) {
        info.cursor = true;
        info.detectionDetails.cursorReason = '.cursor/ directory exists';
    }
    // Priority 3: .cursorrules file exists
    else if (existsSync(join(projectPath, '.cursorrules'))) {
        info.cursor = true;
        info.detectionDetails.cursorReason = '.cursorrules file exists';
    }

    // === CLAUDE CODE DETECTION ===
    // Check for Claude-specific files/directories
    if (existsSync(join(projectPath, 'CLAUDE.md'))) {
        info.claude = true;
        info.detectionDetails.claudeReason = 'CLAUDE.md file exists';
    } else if (existsSync(join(projectPath, '.claude'))) {
        info.claude = true;
        info.detectionDetails.claudeReason = '.claude/ directory exists';
    }
    // Also check Claude Code environment variables (common patterns)
    if (process.env.CLAUDE_CODE === '1' || process.env.ANTHROPIC_API_KEY) {
        if (!info.claude) {
            info.claude = true;
            info.detectionDetails.claudeReason = 'Claude Code environment variables detected';
        }
    }

    // === COPILOT DETECTION ===
    // Check for GitHub Copilot instruction file
    const copilotInstructionsPath = join(projectPath, '.github', 'copilot-instructions.md');
    if (existsSync(copilotInstructionsPath)) {
        info.copilot = true;
        info.detectionDetails.copilotReason = '.github/copilot-instructions.md exists';
    }
    // If .github directory exists but we're not in Cursor, suggest Copilot
    else if (existsSync(join(projectPath, '.github')) && !info.cursor) {
        info.copilot = true;
        info.detectionDetails.copilotReason = '.github/ directory exists (Copilot likely)';
    }
    // Also check .vscode directory as Copilot hint (only if cursor is false)
    else if (existsSync(join(projectPath, '.vscode')) && !info.cursor) {
        info.copilot = true;
        info.detectionDetails.copilotReason = '.vscode/ directory exists (VS Code/Copilot likely)';
    }

    // === CONFLICT RESOLUTION ===
    // If both Cursor and Copilot markers found, warn the user
    if (info.cursor && info.copilot) {
        info.warnings.push(
            'Detected both Cursor and Copilot environments. Rules will be synced to both.'
        );
    }

    // If running in Cursor but .github exists, should we sync to Copilot too?
    if (info.cursor && existsSync(join(projectPath, '.github'))) {
        const hasExplicitCopilotFile = existsSync(copilotInstructionsPath);
        if (hasExplicitCopilotFile) {
            info.copilot = true;
            if (!info.warnings.some(w => w.includes('Cursor and Copilot'))) {
                info.warnings.push(
                    'Detected both Cursor and Copilot environments. Rules will be synced to both.'
                );
            }
        }
    }

    return info;
}

/**
 * Auto-suggest rule packs based on detected dependencies (Smart Scan)
 * Maps project dependencies to recommended rule pack paths
 */
export interface RulePackSuggestion {
    packPath: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
}

export function suggestRulePacksFromDeps(projectPath: string = process.cwd()): RulePackSuggestion[] {
    const suggestions: RulePackSuggestion[] = [];
    const packageJsonPath = join(projectPath, 'package.json');

    // Always suggest core rules
    suggestions.push({
        packPath: 'core',
        reason: 'Core rules always recommended',
        confidence: 'high',
    });

    // Check package.json for Node.js projects
    if (existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
            };

            // Next.js detection
            if (allDeps['next']) {
                suggestions.push({
                    packPath: 'stacks/nextjs',
                    reason: 'next package detected in dependencies',
                    confidence: 'high',
                });
            }

            // Tailwind detection
            if (allDeps['tailwindcss']) {
                suggestions.push({
                    packPath: 'frontend/tailwind',
                    reason: 'tailwindcss package detected',
                    confidence: 'high',
                });
            }

            // React detection
            if (allDeps['react']) {
                suggestions.push({
                    packPath: 'stacks/react',
                    reason: 'react package detected',
                    confidence: 'high',
                });
            }

            // TypeScript detection
            if (allDeps['typescript']) {
                suggestions.push({
                    packPath: 'languages/typescript',
                    reason: 'typescript package detected',
                    confidence: 'high',
                });
            }
        } catch {
            // Ignore parse errors
        }
    }

    // Python detection
    if (
        existsSync(join(projectPath, 'requirements.txt')) ||
        existsSync(join(projectPath, 'pyproject.toml')) ||
        existsSync(join(projectPath, 'setup.py'))
    ) {
        suggestions.push({
            packPath: 'languages/python',
            reason: 'Python project files detected',
            confidence: 'high',
        });
    }

    // Docker detection
    if (
        existsSync(join(projectPath, 'docker-compose.yml')) ||
        existsSync(join(projectPath, 'docker-compose.yaml')) ||
        existsSync(join(projectPath, 'Dockerfile'))
    ) {
        suggestions.push({
            packPath: 'devops/docker',
            reason: 'Docker configuration files detected',
            confidence: 'high',
        });
    }

    return suggestions;
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

                // Check for Next.js specifically
                if (allDeps['next']) {
                    info.frameworks.push('nextjs');
                    info.stacks.push({ name: 'Next.js', type: 'framework', ruleCount: 8 });
                }
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

            // Enhanced: Check for Express/Node backend
            if (allDeps['express'] || allDeps['fastify'] || allDeps['koa']) {
                info.frameworks.push('node-backend');
                info.stacks.push({ name: 'Node.js Backend', type: 'framework', ruleCount: 12 });
            }

            // Enhanced: Check for database libraries
            if (allDeps['prisma'] || allDeps['typeorm'] || allDeps['sequelize'] || allDeps['mongoose']) {
                info.frameworks.push('database');
                info.stacks.push({ name: 'Database ORM', type: 'tool', ruleCount: 8 });
            }

            // Enhanced: Check for testing frameworks
            if (allDeps['jest'] || allDeps['vitest'] || allDeps['mocha'] || allDeps['@playwright/test']) {
                if (!info.hasTests) {
                    info.hasTests = true;
                    info.stacks.push({ name: 'Testing', type: 'tool', ruleCount: 6 });
                }
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

        // Debug log
        console.log(`Checking ${compPath} (rel: ${relPath}), depth: ${depth}, exists: ${existsSync(compPath)}, ignored: ${shouldIgnore(ig, projectPath, compPath)}`);

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
    if (existsSync(join(projectPath, 'Dockerfile')) ||
        existsSync(join(projectPath, 'docker-compose.yml')) ||
        existsSync(join(projectPath, 'docker-compose.yaml'))) {
        info.hasDocker = true;
        info.stacks.push({ name: 'Docker', type: 'tool', ruleCount: 20 });
    }

    // Enhanced: Check for Kubernetes
    if (existsSync(join(projectPath, 'k8s')) ||
        existsSync(join(projectPath, 'kubernetes')) ||
        existsSync(join(projectPath, 'deployment.yaml'))) {
        info.frameworks.push('kubernetes');
        info.stacks.push({ name: 'Kubernetes', type: 'tool', ruleCount: 8 });
    }

    // Enhanced: Check for Terraform/IaC
    if (existsSync(join(projectPath, 'main.tf')) ||
        existsSync(join(projectPath, 'terraform'))) {
        info.frameworks.push('terraform');
        info.stacks.push({ name: 'Infrastructure as Code', type: 'tool', ruleCount: 6 });
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
    const rules: string[] = ['core', 'hygiene']; // Always include core and hygiene rules

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

    // Enhanced: Add security rules when sensitive data is detected
    if (info.hasEnvFiles || info.frameworks.includes('database')) {
        rules.push('security');
    }

    // Enhanced: Add Docker rules when Docker is detected
    if (info.hasDocker) {
        rules.push('docker');
    }

    // Enhanced: Add AI guidelines (always useful for modern development)
    rules.push('ai-guidelines');

    // Enhanced: Add code quality rules (always useful)
    rules.push('code-quality');

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


// ============================================================================
// ASYNC DETECTION WITH FAST-GLOB AND PERSISTENT CACHING
// ============================================================================

import { createHash } from 'crypto';
import { promises as fsPromises } from 'fs';
import fg from 'fast-glob';

/**
 * Persistent cache structure stored in .never/cache.json
 */
interface PersistentCache {
    packageJsonHash: string;
    /** Config hash from getConfigHash() to detect changes in tsconfig, requirements.txt, etc. */
    configHash: string;
    timestamp: string;
    result: ProjectInfo;
}

/**
 * Calculate MD5 hash of package.json content
 */
function calculateMD5Hash(content: string): string {
    return createHash('md5').update(content).digest('hex');
}

/**
 * Load persistent cache from .never/cache.json
 */
async function loadPersistentCache(projectPath: string): Promise<PersistentCache | null> {
    const cachePath = join(projectPath, '.never', 'cache.json');
    try {
        const content = await fsPromises.readFile(cachePath, 'utf-8');
        return JSON.parse(content) as PersistentCache;
    } catch {
        return null;
    }
}

/**
 * Save cache to .never/cache.json
 */
async function savePersistentCache(projectPath: string, cache: PersistentCache): Promise<void> {
    const neverDir = join(projectPath, '.never');
    try {
        await fsPromises.mkdir(neverDir, { recursive: true });
        const cachePath = join(neverDir, 'cache.json');
        await fsPromises.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
    } catch {
        // Silently fail - cache is optional
    }
}

/**
 * Async project detection using fast-glob with persistent caching
 * Uses MD5 hash of package.json and config hash to determine if cache is still valid
 */
export async function detectProjectAsync(
    projectPath: string = process.cwd(),
    options: DetectOptions = {}
): Promise<ProjectInfo> {
    const useCache = options.useCache ?? true;

    // Calculate current package.json hash
    const packageJsonPath = join(projectPath, 'package.json');
    let currentHash = '';

    try {
        const packageJsonContent = await fsPromises.readFile(packageJsonPath, 'utf-8');
        currentHash = calculateMD5Hash(packageJsonContent);
    } catch {
        // No package.json, use mtime-based hash
        currentHash = getConfigHash(projectPath);
    }

    // Calculate config hash for other config files (tsconfig, requirements.txt, etc.)
    const currentConfigHash = getConfigHash(projectPath);

    // Check persistent cache
    if (useCache) {
        const cache = await loadPersistentCache(projectPath);
        if (cache && cache.packageJsonHash === currentHash && cache.configHash === currentConfigHash) {
            // Check if cache is not too old (24 hours)
            const cacheTime = new Date(cache.timestamp).getTime();
            const now = Date.now();
            if (now - cacheTime < 86400000) { // 24 hours
                return cache.result;
            }
        }
    }

    // Perform detection using sync function
    const result = detectProject(projectPath, { ...options, useCache: false });

    // Save to persistent cache
    if (useCache) {
        await savePersistentCache(projectPath, {
            packageJsonHash: currentHash,
            configHash: currentConfigHash,
            timestamp: new Date().toISOString(),
            result,
        });
    }

    return result;
}

/**
 * Async file discovery using fast-glob
 * Returns list of matching files respecting common ignores
 */
export async function discoverFilesAsync(
    projectPath: string,
    patterns: string[],
    options: { maxDepth?: number; ignore?: string[] } = {}
): Promise<string[]> {
    const maxDepth = options.maxDepth ?? 5;
    const ignore = options.ignore ?? ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'];

    const files = await fg(patterns, {
        cwd: projectPath,
        absolute: true,
        deep: maxDepth,
        ignore,
        dot: false,
        onlyFiles: true,
    });

    return files;
}

/**
 * Invalidate the persistent cache
 */
export async function invalidatePersistentCache(projectPath: string): Promise<void> {
    const cachePath = join(projectPath, '.never', 'cache.json');
    try {
        await fsPromises.unlink(cachePath);
    } catch {
        // Cache file does not exist, nothing to do
    }
}
