---
name: claude-code
description: Specific constraints for Claude Code agent behavior
tags:
  - claude
  - agent
priority: 1
globs: "**/*"
---

- **NEVER** run `npm install` without checking if the package is already in `package.json`. Reasoning: Installing redundant packages bloats `node_modules`.
- **NEVER** ask for permission to edit a file if you are in "Agent" or "Yolo" mode. Reasoning: The user has already opted into autonomous editing; pauses break the flow.
- **NEVER** modify the `.cursorrules` or `CLAUDE.md` files themselves unless specifically requested. Reasoning: These are meta-files that control the agent's own behavior.
- **NEVER** use `git commit -m "Update"`; always use descriptive, imperative titles (e.g., `feat: add auth validation`). Reasoning: Vague git history makes debugging regressions difficult.
- **NEVER** ignore linter warnings; fix them immediately. Reasoning: Warnings are errors waiting to happen.
- **NEVER** suggest a third-party library if a native solution exists (e.g., don't suggest lodash for simple array filtering). Reasoning: Fewer dependencies mean fewer vulnerabilities and smaller builds.
- **NEVER** use the word "modern" or "best practice" as a justification; explain the technical benefit. Reasoning: Buzzwords are not arguments; technical merit is.
- **NEVER** create a mock if a real test utility is available. Reasoning: Functioning tests are better than mocked illusions.
- **NEVER** stop a task halfway through; if a file is too long, ask to break it up first. Reasoning: Incomplete code is worse than no code.
- **NEVER** provide code snippets for a language not used in the repo (e.g., don't give Python examples in a TS repo). Reasoning: Irrelevant context confuses the reader and the codebase.
