/**
 * Local Testing Script for Never v0.0.1
 * Tests SafetyManager, ConflictDetector, and SyncEngine
 */

import { SafetyManager, ConflictDetector, SyncEngine, detectProject } from './index.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), `never-test-${Date.now()}`);
mkdirSync(testDir, { recursive: true });

console.log('\n=== Never v0.0.1 Local Testing ===\n');
console.log(`Test directory: ${testDir}\n`);

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
    try {
        if (fn()) {
            console.log(`✓ ${name}`);
            passed++;
        } else {
            console.log(`✗ ${name}`);
            failed++;
        }
    } catch (error) {
        console.log(`✗ ${name} - Error: ${error}`);
        failed++;
    }
}

// Test 1: SafetyManager atomic writes
test('SafetyManager atomic writes', () => {
    const safety = new SafetyManager(testDir);
    const testFile = join(testDir, 'atomic-test.txt');

    safety.atomicWrite(testFile, 'Hello, World!');

    const content = readFileSync(testFile, 'utf-8');
    return content === 'Hello, World!' && !existsSync(`${testFile}.tmp`);
});

// Test 2: SafetyManager backup creation
test('SafetyManager creates backup', () => {
    const safety = new SafetyManager(testDir);
    const testFile = join(testDir, 'backup-test.txt');

    writeFileSync(testFile, 'Original content');
    const backupPath = safety.createBackup(testFile);

    return backupPath !== null && existsSync(backupPath);
});

// Test 3: SafetyManager rollback
test('SafetyManager rollback works', () => {
    const safety = new SafetyManager(testDir);
    const testFile = join(testDir, 'rollback-test.txt');

    writeFileSync(testFile, 'Original');
    safety.createBackup(testFile);
    writeFileSync(testFile, 'Modified');

    const success = safety.rollback(testFile);
    const content = readFileSync(testFile, 'utf-8');

    return success && content === 'Original';
});

// Test 4: SafetyManager safeWrite (backup + atomic)
test('SafetyManager safeWrite combines backup + atomic', () => {
    const safety = new SafetyManager(testDir);
    const testFile = join(testDir, 'safe-write-test.txt');

    writeFileSync(testFile, 'Before');
    const backupPath = safety.safeWrite(testFile, 'After');
    const content = readFileSync(testFile, 'utf-8');

    return backupPath !== null && content === 'After';
});

// Test 5: SafetyManager diff generation
test('SafetyManager generates diff correctly', () => {
    const safety = new SafetyManager(testDir);
    const testFile = join(testDir, 'diff-test.txt');

    writeFileSync(testFile, 'line1\nline2\nline3');
    const diff = safety.generateDiff(testFile, 'line1\nmodified\nline3');

    return diff.changes.some(c => c.type === 'add' && c.content === 'modified');
});

// Test 6: ConflictDetector finds conflicts
test('ConflictDetector detects similar rules', () => {
    const detector = new ConflictDetector();

    const existing = 'Always use TypeScript for new projects.\nPrefer functional components.';
    const newRules = ['Never use JavaScript for new projects'];

    const conflicts = detector.detectConflicts(existing, newRules, 0.3);

    return conflicts.length > 0;
});

// Test 7: ConflictDetector filters conflicting rules
test('ConflictDetector filters out conflicting rules', () => {
    const detector = new ConflictDetector();

    const existing = 'Always use TypeScript for type safety in your projects.';
    const newRules = ['Never use TypeScript for type safety', 'Never use console.log'];

    const { safe, skipped } = detector.filterConflictingRules(existing, newRules, 0.3);

    return skipped.length >= 1 && safe.length >= 1;
});

// Test 8: ConflictDetector ignores Never markers
test('ConflictDetector ignores content inside Never markers', () => {
    const detector = new ConflictDetector();

    const existing = `My rules
<!-- NEVER-RULES-START -->
Never use eval
<!-- NEVER-RULES-END -->
Always test code`;

    const extracted = detector.extractNonNeverContent(existing);

    return !extracted.includes('Never use eval') && extracted.includes('Always test code');
});

// Test 9: Stack detection
test('StackScanner detects project info', () => {
    // Create a mock project
    mkdirSync(join(testDir, 'mock-project'), { recursive: true });
    writeFileSync(join(testDir, 'mock-project', 'tsconfig.json'), '{}');
    writeFileSync(join(testDir, 'mock-project', 'package.json'), JSON.stringify({
        dependencies: { react: '^18.0.0' }
    }));

    const info = detectProject(join(testDir, 'mock-project'));

    return info.hasTypeScript && info.hasReact;
});

// Test 10: SyncEngine initialization
test('SyncEngine initializes correctly', () => {
    const engine = new SyncEngine(testDir, join(testDir, 'library'));
    return engine !== null;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

// Cleanup
rmSync(testDir, { recursive: true, force: true });

process.exit(failed > 0 ? 1 : 0);
