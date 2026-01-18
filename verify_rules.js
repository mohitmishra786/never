import { RuleRegistry } from './packages/core/dist/registry.js';
import { detectProject } from './packages/core/dist/StackScanner.js';
import { join } from 'path';

const libraryPath = join(process.cwd(), 'packages/library');
const registry = new RuleRegistry();
registry.loadFromMarkdownDirectory(libraryPath);

console.log('--- Registry Stats ---');
console.log(`Total Rules: ${registry.getCount()}`);
console.log(`Categories: ${registry.getAllCategories().join(', ')}`);
console.log(`Tags: ${registry.getAllTags().join(', ')}`);

const hygieneRules = registry.getRulesByCategory('hygiene');
console.log(`\nHygiene Rules: ${hygieneRules.length}`);

// Test file matching
const tsFile = 'src/components/Button.tsx';
const matchingRules = registry.getRulesForFile(tsFile);
console.log(`\nMatching rules for ${tsFile}: ${matchingRules.length}`);
matchingRules.forEach(r => console.log(`- [${r.category}] ${r.content.substring(0, 50)}...`));
