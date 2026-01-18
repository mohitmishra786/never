#!/usr/bin/env tsx
/**
 * Integration test for NPM package
 * Creates a tarball, installs it in a temp directory, and verifies it works
 */

import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chalk from 'chalk';

const testDir = join(tmpdir(), `never-npm-test-${Date.now()}`);
let cleanup = true;

function log(message: string) {
    console.log(chalk.cyan(`[TEST] ${message}`));
}

function error(message: string) {
    console.error(chalk.red(`[ERROR] ${message}`));
}

function success(message: string) {
    console.log(chalk.green(`[SUCCESS] ${message}`));
}

function runCommand(cmd: string, cwd: string = testDir): string {
    try {
        return execSync(cmd, { 
            cwd, 
            encoding: 'utf-8',
            stdio: 'pipe'
        });
    } catch (err: any) {
        error(`Command failed: ${cmd}`);
        error(err.message);
        if (err.stdout) console.log(err.stdout);
        if (err.stderr) console.error(err.stderr);
        throw err;
    }
}

async function testNpmPackage() {
    console.log(chalk.bold('\nTesting NPM Package Integration\n'));
    console.log('='.repeat(50));
    
    try {
        // Step 1: Build packages
        log('Building packages...');
        runCommand('npm run build', process.cwd());
        success('Packages built successfully');
        
        // Step 2: Pack @mohitmishra7/never-core
        log('Creating tarball for @mohitmishra7/never-core...');
        const corePackageDir = join(process.cwd(), 'packages', 'core');
        const packOutput = runCommand('npm pack', corePackageDir);
        const tarballName = packOutput.trim().split('\n').pop()?.trim();
        
        if (!tarballName) {
            throw new Error('Failed to get tarball name from npm pack output');
        }
        
        const tarballPath = join(corePackageDir, tarballName);
        
        if (!existsSync(tarballPath)) {
            throw new Error(`Tarball not found at ${tarballPath}`);
        }
        
        success(`Created tarball: ${tarballName}`);
        
        // Step 3: Create test directory
        log(`Creating test directory: ${testDir}`);
        mkdirSync(testDir, { recursive: true });
        
        // Step 4: Initialize test project
        log('Initializing test project...');
        writeFileSync(join(testDir, 'package.json'), JSON.stringify({
            name: 'never-test-project',
            version: '1.0.0',
            type: 'module',
            private: true
        }, null, 2));
        
        // Step 5: Install the tarball
        log('Installing @mohitmishra7/never-core from tarball...');
        runCommand(`npm install ${tarballPath}`);
        success('Package installed successfully');
        
        // Step 6: Verify library is bundled
        log('Verifying bundled library exists...');
        const libraryPath = join(testDir, 'node_modules', '@mohitmishra7', 'never-core', 'dist', 'bundled-library');
        
        if (!existsSync(libraryPath)) {
            throw new Error(`Bundled library not found at ${libraryPath}`);
        }
        
        // Check for key library files
        const expectedFiles = [
            'core/code.md',
            'core/safety.md',
            'core/security.md',
            'core/code-quality.md',
            'core/ai-guidelines.md',
            'stacks/docker.md',
            'languages/typescript.md',
            'languages/python.md',
            'web/react.md'
        ];
        
        let missingFiles = 0;
        for (const file of expectedFiles) {
            const filePath = join(libraryPath, file);
            if (!existsSync(filePath)) {
                error(`Missing library file: ${file}`);
                missingFiles++;
            }
        }
        
        if (missingFiles > 0) {
            throw new Error(`${missingFiles} library files are missing`);
        }
        
        success(`All ${expectedFiles.length} expected library files found`);
        
        // Step 7: Test importing and using the package
        log('Testing package API...');
        const testScript = `
import { detectProject, suggestRuleSets, getLibraryPath, loadRulesFromLibrary } from '@mohitmishra7/never-core';

// Test 1: detectProject
const projectInfo = detectProject('${testDir}');
console.log('detectProject:', projectInfo.hasNode ? 'PASS' : 'FAIL');

// Test 2: suggestRuleSets
const rules = suggestRuleSets(projectInfo);
console.log('suggestRuleSets:', rules.length > 0 ? 'PASS' : 'FAIL');

// Test 3: getLibraryPath
const libraryPath = getLibraryPath();
console.log('getLibraryPath:', libraryPath.length > 0 ? 'PASS' : 'FAIL');

// Test 4: loadRulesFromLibrary
const allRules = loadRulesFromLibrary(libraryPath);
console.log('loadRulesFromLibrary:', allRules.length > 0 ? 'PASS' : 'FAIL');

console.log('Total rules loaded:', allRules.length);
`;
        
        writeFileSync(join(testDir, 'test.mjs'), testScript);
        const output = runCommand('node test.mjs');
        
        if (!output.includes('PASS')) {
            throw new Error('API tests failed:\n' + output);
        }
        
        success('Package API tests passed');
        console.log('\nTest Output:');
        console.log(output);
        
        // Step 8: Verify rule count
        const totalRulesMatch = output.match(/Total rules loaded: (\d+)/);
        if (totalRulesMatch) {
            const ruleCount = parseInt(totalRulesMatch[1], 10);
            if (ruleCount < 5) {
                throw new Error(`Expected at least 5 rule files, got ${ruleCount}`);
            }
            success(`Loaded ${ruleCount} rule files`);
        }
        
        // Step 9: Test file content
        log('Verifying rule content format...');
        const sampleRulePath = join(libraryPath, 'core', 'security.md');
        const sampleContent = readFileSync(sampleRulePath, 'utf-8');
        
        if (!sampleContent.includes('---')) {
            throw new Error('Rule file missing YAML frontmatter');
        }
        
        if (!sampleContent.includes('**Never**')) {
            throw new Error('Rule file missing bold Never statements');
        }
        
        success('Rule format validation passed');
        
        // Success!
        console.log('\n' + '='.repeat(50));
        console.log(chalk.green.bold('\nAll integration tests passed!\n'));
        
        cleanup = true;
        
    } catch (err) {
        console.log('\n' + '='.repeat(50));
        error('Integration test failed');
        console.error(err);
        cleanup = false;
        process.exit(1);
    } finally {
        // Cleanup
        if (cleanup) {
            log('Cleaning up test directory...');
            try {
                rmSync(testDir, { recursive: true, force: true });
                
                // Also clean up tarball
                const corePackageDir = join(process.cwd(), 'packages', 'core');
                const tarballs = execSync('ls *.tgz 2>/dev/null || true', { 
                    cwd: corePackageDir, 
                    encoding: 'utf-8' 
                }).trim().split('\n').filter(Boolean);
                
                for (const tarball of tarballs) {
                    rmSync(join(corePackageDir, tarball), { force: true });
                }
                
                success('Cleanup complete');
            } catch (cleanupErr) {
                console.warn('Warning: Cleanup failed, you may need to manually delete:', testDir);
            }
        } else {
            console.log(chalk.yellow(`\nTest directory preserved for debugging: ${testDir}`));
        }
    }
}

// Run test
testNpmPackage();
