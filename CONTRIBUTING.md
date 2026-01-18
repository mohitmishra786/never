# Contributing to Never

Thanks for considering a contribution. The project benefits most from two types of additions: new rules that capture real-world constraints, and improvements to the sync engines that make output more useful.

## Adding New Rules

The library lives in `library/`. Each markdown file follows a specific format that the parser understands.

```markdown
---
name: Rule Category Name
description: What this category covers
category: security  # One of: security, style, logic, workflow, quality, core
tags: [relevant, tags]
globs: "**/*.ts"
alwaysApply: false
---

# Category Title

## Section Name

- Never do the thing that causes problems
- Never do the other thing that causes different problems
```

### Frontmatter Fields

The frontmatter tells the sync engines how to handle the rules:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable category name |
| `description` | string | Yes | Brief explanation for the list command |
| `category` | enum | No | One of: `security`, `style`, `logic`, `workflow`, `quality`, `core` |
| `tags` | string[] | No | Used for filtering and grouping |
| `globs` | string | No | File patterns where these rules apply (default: `**/*`) |
| `alwaysApply` | boolean | No | Whether rules load regardless of file type (default: `true`) |

### Category Guidelines

- **security**: Rules preventing vulnerabilities, credential exposure, injection attacks
- **style**: Code formatting, naming conventions, documentation requirements
- **logic**: Algorithm correctness, edge case handling, state management
- **workflow**: Development process, git practices, deployment constraints
- **quality**: Code structure, maintainability, testing requirements
- **core**: Fundamental rules that apply across all projects

Each rule should start with "Never" and describe a specific, actionable constraint. Avoid vague guidance like "write clean code" in favor of concrete requirements like "never use magic numbers without defining named constants."

## Rule Quality Guidelines

Before submitting a rule, consider:

1. **Is it specific?** "Never use any" is clear. "Never write bad code" is not.
2. **Is it universal?** Rules should apply across projects, not encode personal preferences.
3. **Is it justified?** Each constraint should prevent a real, documented problem.
4. **Is it testable?** Could a reviewer verify whether code follows the rule?

## Engine Improvements

The sync engines in `cli/src/engines/` convert parsed rules to tool-specific formats. If you are adding support for a new AI tool, create a new engine file following the existing patterns:

1. Export a function that takes `ParsedRule[]` and returns formatted content
2. Handle the tool's specific format requirements
3. Add a config option in the `targets` section
4. Update the sync command to call your engine

### Using the SyncEngine Class

For complex integrations, you can use the `SyncEngine` class in `cli/src/engines/SyncEngine.ts`:

```typescript
import { SyncEngine } from './engines/SyncEngine.js';

const engine = new SyncEngine({
    projectPath: '/path/to/project',
    dryRun: false,
    verbose: true,
});

const summary = engine.syncAll();
console.log(`Generated ${summary.results.length} files`);
```

## Pull Request Process

1. Create a branch from `main` with a descriptive name
2. Make your changes with clear, atomic commits
3. Run `npm run build` and `npm test` to verify nothing breaks
4. Open a PR with a description of what and why

## Code Style

The project uses TypeScript with strict mode enabled. Follow the existing patterns:

- Explicit types for function parameters and return values
- Const by default, let when necessary, never var
- Early returns over nested conditionals
- Descriptive names over comments

No linting rules are enforced automatically yet, but that might change.

## MCP Server Contributions

The MCP server in `/mcp` exposes Never constraints to AI agents via the Model Context Protocol. Contributions here should:

1. Follow the MCP SDK patterns in `mcp/src/index.ts`
2. Add new tools with proper input schemas
3. Document usage in `mcp/README.md`

## Questions

Open an issue if something is unclear. Better to ask than to guess.

