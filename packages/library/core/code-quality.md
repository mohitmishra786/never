---
name: Code Quality
description: Professional coding standards to prevent technical debt and improve maintainability
tags: [core, quality, maintainability]
globs: "**/*"
alwaysApply: true
---

# Code Quality Constraints

## Naming & Clarity

- **Never** use generic variable names like `data`, `item`, `obj`, `value`, `temp`, or single letters (except loop counters); use descriptive names
- **Never** use abbreviations unless they're industry-standard; spell out names (`userRepository` not `usrRepo`)
- **Never** name boolean variables without `is`, `has`, `should`, or `can` prefixes

## Magic Numbers & Constants

- **Never** use "magic numbers" or magic strings in business logic (`if (status == 2)`); define named constants
- **Never** hardcode configuration values like timeouts, limits, or URLs in code; extract to configuration files

## Error Handling

- **Never** catch an error and silently ignore it (`catch (e) {}` or `except: pass`); always log the error or handle it explicitly
- **Never** use generic error messages like "Something went wrong"; include context
- **Never** throw strings or primitive values as errors; throw Error objects with stack traces
- **Never** swallow errors in promise chains without logging

## Functions & Complexity

- **Never** create functions longer than 50-75 lines; extract sub-functions or refactor
- **Never** nest more than 3 levels of indentation; use early returns or guard clauses
- **Never** use nested ternary operators (`a ? b : c ? d : e`); use if/else statements
- **Never** create functions with more than 4-5 parameters; use parameter objects

## Comments & Documentation

- **Never** write comments that explain WHAT the code does; write comments that explain WHY
- **Never** write a Regular Expression without a comment explaining what it matches
- **Never** leave TODO comments without a ticket/issue reference

## Code Organization

- **Never** import from parent directories more than two levels deep (`../../utils`); use path aliases
- **Never** create circular dependencies between modules; refactor to extract shared code
- **Never** mix business logic with presentation logic; separate concerns

## Testing

- **Never** write code without accompanying tests unless it's a prototype
- **Never** use `console.log` for debugging in production code; use proper logging libraries
- **Never** leave console.log "breadcrumbs" in final code (`console.log("here 1")`)

## Performance

- **Never** perform expensive operations (API calls, database queries) inside loops; extract and batch
- **Never** fetch all records from database when you only need a subset; use pagination or `LIMIT`
- **Never** use synchronous operations in async contexts; use async variants

## Dependencies

- **Never** use deprecated APIs or libraries; migrate to modern alternatives
- **Never** install packages without checking their maintenance status
- **Never** modify `package-lock.json`, `yarn.lock`, or similar lock files manually

## Type Safety

- **Never** ignore TypeScript errors with `@ts-ignore` or `any` without a comment explaining why
- **Never** use `var` in JavaScript; use `const` by default and `let` when reassignment is needed
- **Never** compare with `==` in JavaScript; use strict equality `===`

## Git & Version Control

- **Never** commit generated files (`dist/`, `build/`) to version control; add to `.gitignore`
- **Never** commit commented-out code; delete it and use version control to recover if needed
- **Never** make massive commits with unrelated changes; commit logical units of work
