/**
 * @mohitmishra7/never-core - Core engine for Never constraint management
 */

// Safety & Resilience
export { SafetyManager, createSafetyManager, type BackupInfo, type FileDiff, type DiffEntry } from './SafetyManager.js';
export { ConflictDetector, createConflictDetector, type Conflict } from './ConflictDetector.js';

// Library Management
export { LibrarySync, createLibrarySync, type LibrarySyncResult, type RuleManifest } from './LibrarySync.js';
export { loadConfig, getLibraryPath, type NeverConfig } from './config.js';

// Rule Registry
export {
    RuleRegistry,
    createRegistryFromLibrary,
    RuleSchema,
    RulePackSchema,
    type Rule,
    type RulePack,
    type RulePriority,
} from './registry.js';

// Stack Scanner
export {
    detectProject,
    suggestRuleSets,
    generateStackSummary,
    type ProjectInfo,
    type StackInfo,
} from './StackScanner.js';

// Generators
export {
    writeCategoryMdcFiles,
    generateSkillFile,
    updateClaudeFile,
    updateAgentsFile,
    replaceMarkerSection
} from './generators.js';

// Sync Engine
export {
    SyncEngine,
    createSyncEngine,
    type ParsedRule,
    type RuleFrontmatter,
    type SyncResult,
    type SyncOptions,
} from './SyncEngine.js';

export { loadRulesFromLibrary } from './SyncEngine.js';

export type ScanResult = any; // Placeholder until properly typed from StackScanner if needed
export type LintViolation = any; // Placeholder until we verify schema
