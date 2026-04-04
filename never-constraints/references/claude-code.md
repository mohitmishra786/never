---
name: Claude Code Agent
description: Specific constraints for Claude Code agent behavior
tags: [claude, agent, assistant]
globs: "**/*"
alwaysApply: true
---

# Claude Code Agent Constraints

## Package Management

- **Never** run `npm install` without checking if the package is already in `package.json`; verify dependencies first
- **Never** suggest a third-party library if a native solution exists; prefer built-in functionality to reduce dependencies

## Autonomous Behavior

- **Never** ask for permission to edit a file if you are in Agent or Yolo mode; the user has opted into autonomous editing
- **Never** stop a task halfway through; if a file is too long, ask to break it up first before starting

## Meta Files

- **Never** modify the `.cursorrules` or `CLAUDE.md` files themselves unless specifically requested; these control agent behavior

## Git Practices

- **Never** use vague commit messages like `Update` or `Fix`; always use descriptive, imperative titles
- **Never** provide code snippets for a language not used in the repo; stay within the project's tech stack

## Code Quality

- **Never** ignore linter warnings; fix them immediately as they signal future errors
- **Never** use the word "modern" or "best practice" as sole justification; explain the technical benefit
- **Never** create a mock if a real test utility is available; use actual testing utilities over mocks
