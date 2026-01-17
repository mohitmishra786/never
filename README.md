# Never

*"The beginning of wisdom is the definition of terms."* — Socrates

A constraint engine for AI coding assistants. One library to stop them all.

---

Most developers spend hours crafting the perfect system prompt, only to watch their AI assistant ignore half of it. The rules get too long. The context window gets cluttered. The AI starts hallucinating APIs that do not exist while cheerfully adding emojis to your production code.

This is prompt debt. And it compounds faster than technical debt ever could.

**Never** takes a different approach. Instead of dumping 300 rules into a single file and hoping for the best, it provides a structured library of constraints that sync intelligently to whatever AI tool you happen to be using today, whether that is Cursor, Claude Code, or something that does not exist yet.

The rules are modular. The sync is smart. The AI only sees what it needs to see.

## What It Actually Does

When you run `never sync` in your project, three things happen.

First, it reads your `.never/config.yaml` to understand which rule sets you care about. A TypeScript project does not need Python linting rules. A backend API does not need React hooks guidelines.

Second, it looks at your project structure. If there is a `tsconfig.json`, TypeScript rules get included automatically. If there is a `package.json` with React in the dependencies, React rules join the party. You can override this, but the defaults are sensible.

Third, it generates output files tailored to each AI tool:

| Tool | Output | Why |
|------|--------|-----|
| Cursor | `.cursor/rules/*.mdc` | Cursor loads rules based on file globs, so each rule category gets its own file |
| Claude Code | `CLAUDE.md` | Single file that Claude reads at project root |
| Any Agent | `AGENTS.md` | Universal format for future tools |

The `.mdc` format is particularly clever. Instead of one massive rules file that the AI inevitably ignores, each category becomes a separate trigger. Editing a TypeScript file? Only TypeScript rules load. Working on security code? Security constraints activate. The AI's attention stays focused.

## The Rules Themselves

The library ships with over 100 rules across seven categories. These are not arbitrary preferences, they are the constraints that actually matter when AI writes code.

**Security** is non negotiable. No hardcoded secrets. No disabled SSL. No `eval()` with user input. These are the rules that prevent your AI from shipping vulnerabilities to production.

**Code Quality** keeps the output maintainable. No magic numbers. No functions over 50 lines. No inventing APIs that do not exist. That last one matters more than you might think, AI assistants have a remarkable talent for hallucinating plausible looking but entirely fictional library methods.

**Tone** is about professionalism. No emojis in code comments. No "Certainly! I would be happy to help!" at the start of every response. No patronizing language that assumes the developer is a beginner. Just direct, technical communication.

**Workflow** covers the meta level. No generating destructive shell scripts without safeguards. No adding deprecated dependencies. No assuming everyone runs macOS.

Then there are language specific rules for TypeScript, Python, and React. These catch the patterns that cause real problems: using `any` in TypeScript, mutable default arguments in Python, class components in modern React.

## Philosophy

*"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."* — Antoine de Saint-Exupéry

The typical approach to AI constraints is additive. Something goes wrong, you add a rule. Another thing goes wrong, another rule. Before long you have a 5000 word system prompt that nobody, including the AI, actually reads properly.

Never works by subtraction. The library contains the essential constraints. Your config specifies which ones apply. The sync outputs only what is relevant. The AI sees a focused, digestible set of rules instead of an overwhelming wall of text.

This is not about limiting the AI. It is about giving it clarity. An assistant that knows exactly what it should never do is far more useful than one drowning in contradictory or irrelevant guidance.

## Technical Approach

The CLI is written in TypeScript because that is what most JavaScript developers have available. It uses `commander` for argument parsing, `gray-matter` for YAML frontmatter, and `yaml` for config files. No framework, no build complexity, just straightforward Node.js code.

Each rule file in the library follows a consistent format: YAML frontmatter with metadata, then markdown content with individual rules as bullet points. The parser extracts both the structured data and the human readable content, converting them to whatever output format each tool requires.

The sync engines are intentionally simple. They take parsed rules in, they write formatted files out. There is no caching, no incremental builds, no clever optimization. Sync runs in under a second for typical projects. Premature optimization would add complexity without meaningful benefit.

## Looking Ahead

The current release handles the common cases, TypeScript projects, Python projects, React frontends. But the real power of Never comes from the community. Every team has constraints they have learned the hard way. Every codebase has patterns that should never appear again.

The library is designed for contribution. Add a `rust.md` to `library/languages/`. Add a `tailwind.md` to `library/web/`. The CLI will pick them up automatically. Your hard won knowledge becomes everyone's protection.

*"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* — Aristotle

The constraints you set today become the standards your AI follows tomorrow.

---

MIT License
