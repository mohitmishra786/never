---
name: TypeScript
description: TypeScript-specific constraints
tags: [typescript, javascript]
globs: "**/*.{ts,tsx}"
alwaysApply: false
---

# TypeScript Constraints

## Type Safety

- Never use `any` type; always aim for strict typing with proper interfaces or generics
- Never use type assertions (as) to bypass type checking without justification
- Never disable TypeScript strict mode or individual strict checks
- Never use @ts-ignore or @ts-expect-error without a comment explaining why

## Variable Declarations

- Never use `var`; always use `const` or `let`
- Never use `let` when `const` would suffice
- Never declare variables without initializing them when type inference is possible

## Modern Syntax

- Never use string concatenation for building SQL queries or dynamic code
- Never use callbacks when async/await is available
- Never use `.then()` chains when async/await would be clearer
- Never use `arguments` object; use rest parameters instead

## Best Practices

- Never disable ESLint rules inline without strong justification
- Never export mutable variables; export functions or immutable values
- Never use non-null assertion (!) without checking for null/undefined first
- Never mix different module systems (CommonJS and ES modules) in the same project

## React/JSX (when applicable)

- Never use string refs; use useRef or createRef
- Never access .current on a ref without null checking
- Never define components inside other components
