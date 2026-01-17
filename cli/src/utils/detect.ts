/**
 * Detect project type and suggest appropriate rule sets
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectInfo {
    hasTypeScript: boolean;
    hasPython: boolean;
    hasReact: boolean;
    hasVue: boolean;
    hasAngular: boolean;
    hasNode: boolean;
    hasCursor: boolean;
    frameworks: string[];
}

export function detectProject(projectPath: string = process.cwd()): ProjectInfo {
    const info: ProjectInfo = {
        hasTypeScript: false,
        hasPython: false,
        hasReact: false,
        hasVue: false,
        hasAngular: false,
        hasNode: false,
        hasCursor: false,
        frameworks: [],
    };

    // Check for TypeScript
    if (existsSync(join(projectPath, 'tsconfig.json'))) {
        info.hasTypeScript = true;
        info.frameworks.push('typescript');
    }

    // Check for Python
    if (
        existsSync(join(projectPath, 'pyproject.toml')) ||
        existsSync(join(projectPath, 'requirements.txt')) ||
        existsSync(join(projectPath, 'setup.py'))
    ) {
        info.hasPython = true;
        info.frameworks.push('python');
    }

    // Check for Node.js
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
            }

            // Check for Vue
            if (allDeps['vue'] || allDeps['nuxt']) {
                info.hasVue = true;
                info.frameworks.push('vue');
            }

            // Check for Angular
            if (allDeps['@angular/core']) {
                info.hasAngular = true;
                info.frameworks.push('angular');
            }
        } catch {
            // Ignore parse errors
        }
    }

    // Check for Cursor
    if (existsSync(join(projectPath, '.cursor'))) {
        info.hasCursor = true;
    }

    return info;
}

export function suggestRuleSets(info: ProjectInfo): string[] {
    const rules: string[] = ['core']; // Always include core rules

    if (info.hasTypeScript) {
        rules.push('typescript');
    }

    if (info.hasPython) {
        rules.push('python');
    }

    if (info.hasReact) {
        rules.push('react');
    }

    return rules;
}
