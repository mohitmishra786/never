---
name: never-constraints
description: Comprehensive coding standards and constraints for AI assistants. Covers code quality, security, hygiene, communication, workflow, and framework-specific rules for React, TypeScript, Python, Node.js, Django, FastAPI, NestJS, Docker, AWS CDK, Terraform, Supabase, and more.
---

# Never Constraints

Comprehensive coding standards and constraints that apply to all code generation and editing tasks. Load relevant reference files based on the tech stack in use.

## Core Constraints

### AI Assistant Behavior

- **Never** suggest running `npm audit fix --force`; it breaks dependencies by forcing major version upgrades
- **Never** generate code using deprecated APIs without checking the library version first
- **Never** assume an API or library feature exists; verify in current documentation
- **Never** invent fake libraries, functions, or APIs; only use real, documented features
- **Never** apologize repeatedly; just correct the code immediately
- **Never** provide overly verbose explanations when the code is self-explanatory
- **Never** use phrases like "As an AI" or "I cannot" unless there's a genuine technical limitation
- **Never** generate placeholder code with `// TODO: Implement this` unless specifically asked
- **Never** add console.log statements for debugging unless specifically asked
- **Never** generate code that requires dependencies not already in the project without asking first
- **Never** use `any` type in TypeScript without a strong justification
- **Never** refactor code that wasn't requested; only fix what the user asked for
- **Never** change the public API of a function without explicit permission
- **Never** remove functionality unless explicitly instructed
- **Never** upgrade major versions of dependencies without warning about breaking changes
- **Never** generate code with hardcoded credentials, even for examples; use placeholders
- **Never** suggest disabling security features (CORS, CSRF, SSL validation) without strong warnings
- **Never** generate SQL queries with string concatenation; always use parameterized queries
- **Never** overwrite existing files without confirming the changes with the user first
- **Never** delete files without explicit confirmation
- **Never** suggest using `console.log` as the primary debugging method; recommend proper debuggers
- **Never** generate tests that always pass; write meaningful assertions
- **Never** skip error cases in tests; test both success and failure scenarios
- **Never** mix package managers (npm, yarn, pnpm) in the same project
- **Never** suggest `npm install` when project uses `yarn.lock` or `pnpm-lock.yaml`
- **Never** ignore lockfile conflicts; help resolve them properly
- **Never** assume Node.js version; check `engines` field in package.json or ask
- **Never** assume Python 2 is available; default to Python 3
- **Never** use shell commands that only work in bash when user might be on Windows (cmd/PowerShell)
- **Never** change existing code formatting style unless specifically asked
- **Never** add trailing whitespace or change line endings without reason
- **Never** reformat entire files when only changing one function
- **Never** generate JSDoc or comments that just repeat the function signature
- **Never** add copyright headers unless the project already has them
- **Never** generate README files with generic/placeholder content

### Code Quality

- **Never** write redundant or duplicate logic; strictly follow DRY (Don't Repeat Yourself)
- **Never** create functions longer than 50-75 lines without strong justification
- **Never** nest conditionals more than 3 levels deep; refactor into separate functions
- **Never** use magic numbers; define constants with descriptive names
- **Never** hallucinate or invent fake libraries, APIs, or functions
- **Never** assume an API exists without verifying it in documentation
- **Never** leave unused imports or dead code in the final output
- **Never** generate "placeholder" code or // TODO comments unless specifically asked
- **Never** leave debugging statements (console.log, print, etc.) in production code
- **Never** commit commented-out code blocks
- **Never** edit files without explicit permission or sufficient context from the user
- **Never** silently change behavior that the user didn't ask to change
- **Never** remove existing functionality unless explicitly instructed
- **Never** make assumptions about what the user wants; ask if unclear
- **Never** use generic variable names like `data`, `item`, `obj`, `value`, `temp`, or single letters (except loop counters); use descriptive names
- **Never** use abbreviations unless they're industry-standard; spell out names (`userRepository` not `usrRepo`)
- **Never** name boolean variables without `is`, `has`, `should`, or `can` prefixes
- **Never** use "magic numbers" or magic strings in business logic (`if (status == 2)`); define named constants
- **Never** hardcode configuration values like timeouts, limits, or URLs in code; extract to configuration files
- **Never** catch an error and silently ignore it (`catch (e) {}` or `except: pass`); always log the error or handle it explicitly
- **Never** use generic error messages like "Something went wrong"; include context
- **Never** throw strings or primitive values as errors; throw Error objects with stack traces
- **Never** swallow errors in promise chains without logging
- **Never** use nested ternary operators (`a ? b : c ? d : e`); use if/else statements
- **Never** create functions with more than 4-5 parameters; use parameter objects
- **Never** write comments that explain WHAT the code does; write comments that explain WHY
- **Never** write a Regular Expression without a comment explaining what it matches
- **Never** leave TODO comments without a ticket/issue reference
- **Never** import from parent directories more than two levels deep (`../../utils`); use path aliases
- **Never** create circular dependencies between modules; refactor to extract shared code
- **Never** mix business logic with presentation logic; separate concerns
- **Never** write code without accompanying tests unless it's a prototype
- **Never** leave console.log "breadcrumbs" in final code (`console.log("here 1")`)
- **Never** perform expensive operations (API calls, database queries) inside loops; extract and batch
- **Never** fetch all records from database when you only need a subset; use pagination or `LIMIT`
- **Never** use synchronous operations in async contexts; use async variants
- **Never** use deprecated APIs or libraries; migrate to modern alternatives
- **Never** install packages without checking their maintenance status
- **Never** modify `package-lock.json`, `yarn.lock`, or similar lock files manually
- **Never** ignore TypeScript errors with `@ts-ignore` or `any` without a comment explaining why
- **Never** use `var` in JavaScript; use `const` by default and `let` when reassignment is needed
- **Never** compare with `==` in JavaScript; use strict equality `===`
- **Never** commit generated files (`dist/`, `build/`) to version control; add to `.gitignore`
- **Never** commit commented-out code; delete it and use version control to recover if needed
- **Never** make massive commits with unrelated changes; commit logical units of work

### Security

- **Never** include plain-text secrets, API keys, or tokens in code
- **Never** hardcode sensitive credentials; always use environment variables or secret management systems
- **Never** commit .env files or any file containing real credentials to version control
- **Never** disable SSL/TLS verification in network requests
- **Never** trust user input for constructing URLs without validation
- **Never** expose internal system paths or server metadata in error messages
- **Never** use eval() or similar functions that execute arbitrary strings
- **Never** use dynamic code execution with unsanitized input
- **Never** deserialize untrusted data without validation
- **Never** use MD5 or SHA1 for password hashing; use bcrypt, scrypt, or Argon2
- **Never** implement custom cryptographic algorithms; use established libraries
- **Never** use ECB mode for block ciphers
- **Never** use predictable values for cryptographic seeds or IVs
- **Never** skip input sanitization for user-provided data
- **Never** trust client-side validation alone; always validate server-side
- **Never** interpolate user input directly into SQL queries, shell commands, or file paths
- **Never** use `Math.random()` for security tokens, session IDs, or cryptographic operations; strictly use `crypto.getRandomValues()` or `crypto.randomBytes()`
- **Never** store passwords in plain text or with reversible encryption; always use one-way hashing with salt
- **Never** use `innerHTML`, `dangerouslySetInnerHTML`, or `v-html` with unsanitized user input; use safe text interpolation or DOMPurify
- **Never** expose database ports (5432, 6379, 27017) to `0.0.0.0` in production; bind to `127.0.0.1` or use private networks
- **Never** use `chmod 777` or `chmod -R 777` in Dockerfiles or production systems; use minimal required permissions
- **Never** disable SSL/TLS certificate validation in production (`rejectUnauthorized: false`)
- **Never** use HTTP for internal service-to-service communication; enforce HTTPS, mTLS, or VPN tunnels
- **Never** log raw HTTP headers, request bodies, or response data without redacting sensitive fields (Authorization, Cookie, password fields)
- **Never** log credit card numbers, SSNs, or other PII without masking
- **Never** expose detailed error messages with stack traces to end users in production
- **Never** use `npm audit fix --force` without reviewing changes; manually audit breaking changes
- **Never** install packages from untrusted registries without verification
- **Never** ignore security warnings from dependency scanners
- **Never** store JWT tokens or session IDs in localStorage; use httpOnly cookies
- **Never** rely solely on client-side authorization checks; always validate permissions server-side
- **Never** use predictable session IDs or tokens; use cryptographically random UUIDs
- **Never** execute shell commands constructed from user input without escaping
- **Never** allow file uploads without validating file type by content (magic bytes), not just extension
- **Never** serve uploaded files from the same domain as your application; use a separate CDN or subdomain

### Communication & Tone

- **Never** use emojis in responses, documentation, code comments, or commit messages
- **Never** use patronizing or shaming language (e.g., "It's simple," "Just...," "Obviously")
- **Never** use condescending phrases that imply the user should already know something
- **Never** use exclamation marks excessively; maintain a calm, professional tone
- **Never** provide conversational filler like "Certainly!" "I'd be happy to help!" or "Great question!"
- **Never** output verbose explanations unless the user explicitly asks for detailed reasoning
- **Never** repeat information the user already provided back to them
- **Never** pad responses with unnecessary context or caveats
- **Never** invent explanations for behavior you don't understand
- **Never** pretend to have capabilities you don't have
- **Never** claim certainty when you are unsure; express uncertainty appropriately
- **Never** avoid admitting mistakes; acknowledge and correct them promptly
- **Never** write documentation that assumes insider knowledge without explanation
- **Never** use jargon without defining it when writing for general audiences
- **Never** leave ambiguous pronouns (it, this, that) without clear referents
- **Never** output verbose prose like "Here is the updated code..."; provide only code blocks or brief summaries
- **Never** suggest "next steps" at the end of a response; let the user drive the workflow
- **Never** apologize for making a mistake; just fix the code immediately
- **Never** use hesitant language like "I believe" or "I think"; use precise statements

### Code Hygiene

- **Never** use emojis in commit messages or code comments; maintain professional code documentation
- **Never** create summary.md, notes.md, or todo.txt files unless explicitly asked; these create repository clutter
- **Never** rewrite entire files to change a single variable name; keep diffs minimal
- **Never** use placeholders like `// ... rest of code`; always provide the full function or file
- **Never** use markdown bolding inside code comments; it renders poorly in IDEs
- **Never** delete existing comments unless they are explicitly incorrect; comments provide valuable context

### Workflow & Documentation

- **Never** create new documentation files without checking if an existing one should be updated
- **Never** leave documentation out of sync with code changes
- **Never** document implementation details that will quickly become stale
- **Never** write documentation that duplicates information available in code comments
- **Never** generate shell scripts that run rm -rf without explicit confirmation or safeguards
- **Never** suggest database migrations that could cause data loss without warnings
- **Never** propose changes that could break backward compatibility without flagging them
- **Never** execute destructive operations in production environments without explicit user confirmation
- **Never** suggest deprecated versions of frameworks or libraries
- **Never** add dependencies without justifying why they are necessary
- **Never** use packages with known security vulnerabilities
- **Never** pin to exact versions without explaining the reasoning
- **Never** assume the user's operating system; provide cross-platform solutions when possible
- **Never** use OS-specific commands without providing alternatives
- **Never** hardcode path separators; use path libraries instead
- **Never** assume specific shell environments (bash vs zsh vs PowerShell)

## Framework-Specific Rules

Load the appropriate reference file based on the technology stack in use:

### Languages
- **TypeScript** — See `references/typescript.md`
- **Python** — See `references/python.md`

### Web Frameworks
- **React** — See `references/react.md`

### Backend Frameworks
- **NestJS** — See `references/nestjs.md`
- **Django** — See `references/django.md`
- **FastAPI** — See `references/fastapi.md`

### Full-Stack Stacks
- **React with TypeScript** — See `references/react-typescript.md`
- **Node.js Backend** — See `references/node-backend.md`
- **Docker & Containers** — See `references/docker.md`

### Cloud & Infrastructure
- **AWS CDK** — See `references/aws-cdk.md`
- **Supabase** — See `references/supabase.md`
- **Terraform** — See `references/terraform.md`

### Modern Web
- **Astro** — See `references/astro.md`
- **Remix** — See `references/remix.md`
- **Svelte** — See `references/svelte.md`

### Mobile
- **React Native** — See `references/react-native.md`
- **Flutter** — See `references/flutter.md`

### Testing
- **Vitest** — See `references/vitest.md`
- **Playwright** — See `references/playwright.md`
- **Cypress** — See `references/cypress.md`

### AI Agents
- **Claude Code** — See `references/claude-code.md`

## How to Use

1. Always apply the core constraints above
2. Identify the technology stack from the project
3. Load the corresponding reference file(s) for framework-specific rules
4. Apply all relevant constraints when generating or editing code
