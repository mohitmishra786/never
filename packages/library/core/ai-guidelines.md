---
name: AI Assistant Guidelines
description: Rules specifically for AI coding assistants to prevent common AI-generated code issues
tags: [ai, assistant, claude, cursor]
globs: "**/*"
alwaysApply: true
---

# AI Assistant Constraints

## Accuracy & Verification

- **Never** suggest running `npm audit fix --force`; it breaks dependencies by forcing major version upgrades
- **Never** generate code using deprecated APIs without checking the library version first
- **Never** assume an API or library feature exists; verify in current documentation
- **Never** invent fake libraries, functions, or APIs; only use real, documented features

## Communication Style

- **Never** apologize repeatedly ("I'm sorry, I made a mistake"); just correct the code immediately
- **Never** provide overly verbose explanations when the code is self-explanatory
- **Never** use phrases like "As an AI" or "I cannot" unless there's a genuine technical limitation

## Dependencies & Compatibility

- **Never** provide a solution that requires a paid API without mentioning it explicitly
- **Never** assume the user is on macOS; check for win32 or linux compatibility when using OS-specific features
- **Never** modify `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `Cargo.lock` manually
- **Never** suggest installing global packages without mentioning local alternatives first

## Code Generation

- **Never** generate placeholder code with `// TODO: Implement this` unless specifically asked
- **Never** add console.log statements for debugging unless specifically asked
- **Never** generate code that requires dependencies not already in the project without asking first
- **Never** use `any` type in TypeScript without a strong justification

## Breaking Changes

- **Never** refactor code that wasn't requested; only fix what the user asked for
- **Never** change the public API of a function without explicit permission
- **Never** remove functionality unless explicitly instructed
- **Never** upgrade major versions of dependencies without warning about breaking changes

## Security & Best Practices

- **Never** generate code with hardcoded credentials, even for examples; use placeholders
- **Never** suggest disabling security features (CORS, CSRF, SSL validation) without strong warnings
- **Never** generate SQL queries with string concatenation; always use parameterized queries

## File Operations

- **Never** overwrite existing files without confirming the changes with the user first
- **Never** delete files without explicit confirmation
- **Never** create files in system directories (/usr, /etc, etc.) without sudo and warning

## Testing & Debugging

- **Never** suggest using `console.log` as the primary debugging method; recommend proper debuggers
- **Never** generate tests that always pass; write meaningful assertions
- **Never** skip error cases in tests; test both success and failure scenarios

## Package Managers

- **Never** mix package managers (npm, yarn, pnpm) in the same project
- **Never** suggest `npm install` when project uses `yarn.lock` or `pnpm-lock.yaml`
- **Never** ignore lockfile conflicts; help resolve them properly

## Environment Assumptions

- **Never** assume Node.js version; check `engines` field in package.json or ask
- **Never** assume Python 2 is available; default to Python 3
- **Never** use shell commands that only work in bash when user might be on Windows (cmd/PowerShell)

## Code Style

- **Never** change existing code formatting style unless specifically asked
- **Never** add trailing whitespace or change line endings without reason
- **Never** reformat entire files when only changing one function

## Documentation

- **Never** generate JSDoc or comments that just repeat the function signature
- **Never** add copyright headers unless the project already has them
- **Never** generate README files with generic/placeholder content
