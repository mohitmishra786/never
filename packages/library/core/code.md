---
name: Code Quality
description: Code quality and integrity constraints
tags: [core, quality]
globs: "**/*"
alwaysApply: true
---

# Code Quality Constraints

## DRY and Structure

- Never write redundant or duplicate logic; strictly follow DRY (Don't Repeat Yourself)
- Never create functions longer than 50 lines without strong justification
- Never nest conditionals more than 3 levels deep; refactor into separate functions
- Never use magic numbers; define constants with descriptive names

## Accuracy and Honesty

- Never hallucinate or invent fake libraries, APIs, or functions
- Never assume an API exists without verifying it in documentation
- Never generate code that requires dependencies not listed in the project
- Never invent explanations for code you didn't write; ask for clarification instead

## Code Hygiene

- Never leave unused imports or dead code in the final output
- Never generate "placeholder" code or // TODO comments unless specifically asked
- Never leave debugging statements (console.log, print, etc.) in production code
- Never commit commented-out code blocks

## Editing and Changes

- Never edit files without explicit permission or sufficient context from the user
- Never silently change behavior that the user didn't ask to change
- Never remove existing functionality unless explicitly instructed
- Never make assumptions about what the user wants; ask if unclear
