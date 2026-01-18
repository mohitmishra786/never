/**
 * Claude Skills SKILL.md Generator
 * Generates a "Never Guardian" skill for Claude Code's skill system
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ParsedRule } from './parser.js';

const SKILL_DIR = '.claude/skills/never-guardian';
const SKILL_FILE = 'SKILL.md';

/**
 * Generate the Never Guardian skill content
 */
export function generateSkillContent(rules: ParsedRule[]): string {
    // Count rules by category
    const categoryCounts = new Map<string, number>();
    let totalRules = 0;

    for (const rule of rules) {
        totalRules += rule.rules.length;
        const category = rule.frontmatter.name;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + rule.rules.length);
    }

    const categoryList = Array.from(categoryCounts.entries())
        .map(([cat, count]) => `  - ${cat}: ${count} constraints`)
        .join('\n');

    return `---
name: Never Guardian
description: Validates code against Never constraints to prevent common mistakes
version: 1.0.0
author: Never CLI
tools:
  - name: check_constraints
    description: Check current work against the never-list
    parameters:
      - name: code
        type: string
        description: The code to validate
      - name: file_type
        type: string
        description: The file type being edited (e.g., "typescript", "python")
  - name: get_relevant_rules
    description: Get rules relevant to the current context
    parameters:
      - name: context
        type: string
        description: Description of what you're working on
---

# Never Guardian Skill

A guardian skill that validates code against the Never constraint library. This skill helps maintain code quality by checking your work against established "Never" rules.

## Overview

This skill has access to **${totalRules} constraints** across the following categories:

${categoryList}

## Usage

### Check Constraints

When writing or reviewing code, invoke the \`check_constraints\` tool to validate against Never rules:

\`\`\`
check_constraints(code: "your code here", file_type: "typescript")
\`\`\`

### Get Relevant Rules

To see which rules apply to your current context:

\`\`\`
get_relevant_rules(context: "React component with state management")
\`\`\`

## Key Constraints

The Never Guardian enforces rules in these critical areas:

1. **Security**: No hardcoded secrets, no eval(), no SQL injection vectors
2. **Code Quality**: No magic numbers, no functions over 50 lines, no deep nesting
3. **Accuracy**: No hallucinated APIs, no invented libraries
4. **Tone**: No emojis in code, no patronizing comments

## Integration

This skill is automatically synced by [Never CLI](https://github.com/mohitmishra786/never).

To update constraints:
\`\`\`bash
never sync
\`\`\`

---

*This skill supplements your existing instructions. It does not replace project-specific guidelines.*
`;
}

/**
 * Generate the Never Guardian skill file
 */
export function generateSkillFile(
    projectPath: string,
    rules: ParsedRule[],
    dryRun: boolean = false
): { path: string; content: string; written: boolean } {
    const skillDir = join(projectPath, SKILL_DIR);
    const skillPath = join(skillDir, SKILL_FILE);
    const content = generateSkillContent(rules);

    if (!dryRun) {
        if (!existsSync(skillDir)) {
            mkdirSync(skillDir, { recursive: true });
        }
        writeFileSync(skillPath, content, 'utf-8');
    }

    return {
        path: skillPath,
        content,
        written: !dryRun,
    };
}
