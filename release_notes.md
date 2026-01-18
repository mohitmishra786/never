### 🚀 Never v0.0.5

> [!TIP]
> This release introduces a significantly expanded rule library and smarter project detection.

#### New Features
*   **Expanded Rule Library:** Added curated rules for:
    *   **Hygiene:** General best practices (no emojis, no prose fluff).
    *   **React/TypeScript:** Performance and security constraints.
    *   **Node/Backend:** API security and hygiene.
    *   **Claude Code:** Specific constraints for the Claude agent.
*   **Smarter Detection:** `StackScanner` now automatically suggests hygiene rules and detects React, Node, and Python environments more accurately.
*   **Dynamic Loading:** The `RuleRegistry` now supports deep-nested rule structures (e.g., `library/stacks/react-typescript.md`).

#### Improvements
*   **VS Code Extension:** Removed unnecessary activation events for faster startup. Use `Never: Sync Rules` to get started.

#### Packages (NPM)
*   [@mohitmishra7/never-core](https://www.npmjs.com/package/@mohitmishra7/never-core) (v0.0.5)
*   [@mohitmishra7/never-cli](https://www.npmjs.com/package/@mohitmishra7/never-cli) (v0.0.5)
*   [@mohitmishra7/never-mcp-server](https://www.npmjs.com/package/@mohitmishra7/never-mcp-server) (v0.0.5)
