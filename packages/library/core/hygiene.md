---
name: Code Hygiene
description: General AI behaviors and formatting constraints for clean code
tags: [general, hygiene, style]
globs: "**/*"
alwaysApply: true
---

# Code Hygiene Constraints

## Communication Style

- **Never** use emojis in commit messages or code comments; maintain professional code documentation
- **Never** output verbose prose like "Here is the updated code..."; provide only code blocks or brief summaries
- **Never** suggest "next steps" at the end of a response; let the user drive the workflow
- **Never** apologize for making a mistake; just fix the code immediately
- **Never** use hesitant language like "I believe" or "I think"; use precise statements

## File Management

- **Never** create summary.md, notes.md, or todo.txt files unless explicitly asked; these create repository clutter
- **Never** rewrite entire files to change a single variable name; keep diffs minimal

## Code Completeness

- **Never** use placeholders like `// ... rest of code`; always provide the full function or file
- **Never** use markdown bolding inside code comments; it renders poorly in IDEs

## Comments and Documentation

- **Never** delete existing comments unless they are explicitly incorrect; comments provide valuable context
