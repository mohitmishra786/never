---
name: Workflow & Documentation
description: Workflow and documentation constraints
tags: [core, workflow]
globs: "**/*"
alwaysApply: true
---

# Workflow & Documentation Constraints

## Documentation Management

- Never create new documentation files without checking if an existing one should be updated
- Never leave documentation out of sync with code changes
- Never document implementation details that will quickly become stale
- Never write documentation that duplicates information available in code comments

## Destructive Operations

- Never generate shell scripts that run rm -rf without explicit confirmation or safeguards
- Never suggest database migrations that could cause data loss without warnings
- Never propose changes that could break backward compatibility without flagging them
- Never execute destructive operations in production environments without explicit user confirmation

## Dependencies and Versions

- Never suggest deprecated versions of frameworks or libraries
- Never add dependencies without justifying why they are necessary
- Never use packages with known security vulnerabilities
- Never pin to exact versions without explaining the reasoning

## Cross-Platform Considerations

- Never assume the user's operating system; provide cross-platform solutions when possible
- Never use OS-specific commands without providing alternatives
- Never hardcode path separators; use path libraries instead
- Never assume specific shell environments (bash vs zsh vs PowerShell)
