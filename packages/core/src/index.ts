/**
 * @never/core - Core engine for Never constraint management
 */

// Safety & Resilience
export { SafetyManager, createSafetyManager, type BackupInfo, type FileDiff, type DiffEntry } from './SafetyManager.js';
export { ConflictDetector, createConflictDetector, type Conflict } from './ConflictDetector.js';

// Library Management
export { LibrarySync, createLibrarySync, type LibrarySyncResult, type RuleManifest } from './LibrarySync.js';

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

// Sync Engine
export {
    SyncEngine,
    createSyncEngine,
    type ParsedRule,
    type RuleFrontmatter,
    type NeverConfig,
    type SyncResult,
    type SyncOptions,
} from './SyncEngine.js';
