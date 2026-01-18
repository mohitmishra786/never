# @mohitmishra7/never-core

*"The engine room of the ship."*

This is the core logic that powers **Never**, the constraint engine for AI coding assistants. While the CLI gets the glory and the VS Code extension captures the eyeballs, this library does the heavy lifting.

---

## What It Is

`@mohitmishra7/never-core` is a standalone TypeScript library that orchestrates rule management, synchronization, and safety checks. It is designed to be consumed by UIs (like the CLI) or integrations (like the MCP server) that need to enforce AI constraints.

It has no opinion on *how* you view the rules, only on how they are processed, validated, and persisted.

## Key Architectures

### 1. The Safety Manager
We do not trust file system operations blindly. The `SafetyManager` wraps every write operation in a transaction-like safety net.
*   **Atomic Writes:** Files are written to a temp location and renamed only upon success. No partial writes.
*   **Automatic Backups:** Before ensuring a new constraint file, we snapshot the old one. If something goes wrong, rollback is trivial.
*   **Diff Generation:** We calculate what *will* change before it changes, allowing for dry-run previews.

### 2. Conflict Detection
AI rules often contradict each other. One rule says "always use `const`", another says "prefer `let` for counters". The `ConflictDetector` uses Jaccard similarity and fuzzy matching to identify rules that might be fighting for the same semantic territory. It filters out duplicates before they confuse your LLM.

### 3. The Sync Engine
This is the conductor. It takes the raw markdown rules from the library, filters them through your project's `config.yaml`, and generates the tool-specific formats (MDC for Cursor, system prompts for Claude). It respects the "Parse, Don't Validate" philosophy—if the rule exists and is valid, it gets synced.

## Usage

You likely want the CLI (`@mohitmishra7/never-cli`) instead of this package directly. However, if you are building a custom integration:

```typescript
import { SyncEngine, SafetyManager } from '@mohitmishra7/never-core';

// Initialize the engine
const engine = new SyncEngine(projectPath, libraryPath);

// Sync rules to Claude's format
const result = engine.syncToClaude(activeRules);

// Atomic write with backup
const safety = new SafetyManager(projectPath);
safety.atomicWrite('critical-file.ts', content);
```

## Philosophy

This package follows the **Zero External State** principle. It does not maintain a database. It does not phone home. The file system is the source of truth. If you delete the `.never` folder, the state is gone, and that is a feature, not a bug.

---

MIT License
