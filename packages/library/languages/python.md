---
name: Python
description: Python-specific constraints
tags: [python]
globs: "**/*.py"
alwaysApply: false
---

# Python Constraints

## Common Pitfalls

- Never use mutable default arguments (lists, dicts) in function definitions
- Never use bare `except:` clauses; always catch specific exceptions
- Never use `exec()` or `eval()` with untrusted input
- Never import with wildcard `from module import *`

## Type Hints

- Never omit type hints in function signatures for public APIs
- Never use `Any` type when a more specific type is possible
- Never ignore type checker errors without documented justification

## Code Style

- Never use camelCase for variable or function names; use snake_case
- Never use single-letter variable names except in comprehensions or lambdas
- Never mix tabs and spaces for indentation
- Never exceed 100 characters per line without strong justification

## Best Practices

- Never use `is` for value comparison; use `==` (except for None, True, False)
- Never modify a list while iterating over it
- Never use `assert` for data validation in production code
- Never hardcode file paths; use pathlib or os.path

## Modern Python

- Never use old-style string formatting (%) when f-strings are available
- Never use `dict.keys()` or `dict.values()` when direct iteration works
- Never import from `__future__` unnecessarily in Python 3.10+
- Never use deprecated modules (e.g., optparse, imp)
