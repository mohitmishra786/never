/**
 * esbuild configuration for bundling VS Code extension
 * Bundles the extension with @mohitmishra7/never-core to eliminate npx dependency
 */

import * as esbuild from 'esbuild';
import { existsSync, rmSync } from 'fs';

// Clean dist directory
if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
}

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {esbuild.Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                if (location) {
                    console.error(`    ${location.file}:${location.line}:${location.column}:`);
                }
            });
            console.log('[watch] build finished');
        });
    },
};

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true, // Bundle ALL dependencies (including @mohitmishra7/never-core)
        format: 'cjs', // CommonJS format for VS Code
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node', // Target Node.js (VS Code's runtime)
        outfile: 'dist/extension.js',
        external: ['vscode'], // ONLY exclude vscode - bundle everything else
        logLevel: 'info',
        plugins: [
            esbuildProblemMatcherPlugin,
        ],
        // Ensure we're targeting Node 18+ compatible code
        target: 'node18',
    });

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
