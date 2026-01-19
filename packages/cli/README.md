# @mohitmishra7/never-cli

*"A constraint engine for your AI, not a straitjacket for you."*

The official command-line interface for **Never**. It allows you to synchronize, inspect, and enforce AI coding constraints across your projects.

---

## The Problem

You have a system prompt. It is 4,000 tokens long. It contains rules for TypeScript, rules for Python, rules for that one legacy module nobody touches, and a request to "always be cheerful."

Your AI assistant ignores half of it because the context window is cluttered with irrelevant noise.

## The Solution

**Never** treats prompts as managed infrastructure. Instead of a text dump, you have a library of modular constraints. This CLI ensures that only the relevant rules are active for the current context.

## Installation

```bash
npm install -g @mohitmishra7/never-cli
```

## Commands

### `never init`
Walks you through an interactive setup. It detects your tech stack (TypeScript? React? Python?) and suggests an initial configuration. It creates a `.never/config.yaml` that serves as the blueprint for your project's constraints.

### `never sync`
The workhorse. It reads your config, pulls the corresponding rules from the library, and generates the optimized prompt files for your tools:
*   `.cursor/rules/*.mdc` for Cursor (split by category).
*   `CLAUDE.md` for Claude Code.
*   `AGENTS.md` for generic agentic frameworks.

It validates the rules, checks for conflicts, and performs atomic writes to ensure you never end up with a corrupted state.

### `never lint`
Checks your current code against the active constraints. If you have a rule that says "Never use `eval()`", this command will flag it in your PRs. It is designed to be fast enough to run in a pre-commit hook.

### `never scan`
Analyzes your codebase to recommend rule packs. It looks at `package.json`, `requirements.txt`, and file extensions to understand what you are building, then suggests the constraints you probably should have enabled.

### `never doctor`
Runs health checks and diagnoses common issues with your Never setup. It verifies that the configuration is valid, the rule library is accessible, and the output files are properly formatted.

## Architecture

The CLI is a thin wrapper around `@mohitmishra7/never-core`. It handles the user interaction, argument parsing (via `commander`), and output formatting. The heavy lifting of rule parsing and synchronization happens in the core, ensuring consistent behavior across all Never tools.

## Philosophy

We believe in **Progressive Strictness**. Start with a few critical rules (security, core patterns). Add more as your team aligns. The CLI makes it easy to add or remove rule sets, so your constraints evolve with your codebase.

---

MIT License
