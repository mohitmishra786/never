---
name: Node.js Backend
description: Node.js backend, API, and security constraints
tags: [node, backend, security, api]
globs: "**/*.{ts,js}"
alwaysApply: false
---

# Node.js Backend Constraints

## Security

- **Never** store API keys or secrets in the codebase; always use environment variables
- **Never** use `eval()` or `new Function()`; these enable arbitrary code execution attacks
- **Never** return raw database objects in API responses; use DTOs to prevent data leakage
- **Never** allow an API endpoint to return more than 100 items without pagination; implement limits to prevent OOM crashes

## Error Handling

- **Never** write a `try/catch` block without logging the error to a structured logger; silent failures make debugging impossible

## Performance

- **Never** use sync file operations like `readFileSync` in a request loop; use async operations to avoid blocking
- **Never** perform database queries inside a `forEach` loop; batch queries to prevent N+1 problems

## Code Standards

- **Never** use hardcoded URLs; use a centralized config object for environment-specific values
- **Never** use CommonJS `require`; always use ESM `import/export` for better tree-shaking
- **Never** mix package managers like yarn and npm; stick to one to avoid lockfile conflicts

## Validation & Testing

- **Never** use Zod without enabling strict mode; permissive validation allows data pollution
- **Never** create a new API route without an accompanying `.test.ts` file; untested endpoints are technical debt
