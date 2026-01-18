---
name: node-backend
description: Node.js, Security, and API constraints
tags:
  - node
  - backend
  - security
priority: 1
globs: "**/*.{ts,js,py}"
---

- **NEVER** store API keys or secrets in the codebase; always use `.env`. Reasoning: Hardcoded secrets are the #1 cause of security leaks.
- **NEVER** write a `try/catch` block without logging the error to a structured logger. Reasoning: Silencing errors makes debugging production issues impossible.
- **NEVER** use sync file operations (e.g., `readFileSync`) in a request loop. Reasoning: Blocking the event loop kills server throughput.
- **NEVER** use `eval()` or `new Function()`. Reasoning: These are vectors for arbitrary code execution attacks.
- **NEVER** return raw database objects in API responses; use a DTO (Data Transfer Object). Reasoning: Leaking implementation details (like passwords or internal IDs) is a security risk.
- **NEVER** use hardcoded URLs; use a centralized config object. Reasoning: Hardcoded strings make environment switching (dev/prod) error-prone.
- **NEVER** use CommonJS (`require`); always use ESM (`import/export`). Reasoning: The ecosystem has moved to ESM for better tree-shaking and standards compliance.
- **NEVER** perform database queries inside a `forEach` loop (N+1 problem). Reasoning: This causes massive performance degradation at scale.
- **NEVER** use yarn; the project standard is npm (or pnpm). Reasoning: Mixing package managers creates lockfile drift and CI failures.
- **NEVER** allow an API endpoint to return more than 100 items without pagination. Reasoning: Unbounded datasets cause OOM crashes.
- **NEVER** use `Zod` without enabling strict mode. Reasoning: Permissive validation allows pollution of internal data structures.
- **NEVER** create a new API route without an accompanying `.test.ts` file. Reasoning: Untested endpoints are technical debt from day one.
