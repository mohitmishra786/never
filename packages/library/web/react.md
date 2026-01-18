---
name: React
description: React-specific constraints
tags: [react, javascript, typescript, web]
globs: "**/*.{jsx,tsx}"
alwaysApply: false
---

# React Constraints

## Component Architecture

- Never use Class Components; use Functional Components with hooks
- Never define components inside other components; creates new instances on each render
- Never use shouldComponentUpdate; use React.memo for memoization
- Never mutate props or state directly

## Hooks

- Never call hooks conditionally or inside loops
- Never use useEffect without a dependencies array (unless intentional)
- Never forget to clean up side effects in useEffect return function
- Never use useState for values that can be derived from props or other state

## Lists and Keys

- Never use array index as key for dynamic lists that can reorder
- Never use random values (Math.random, uuid on render) as keys
- Never omit keys when rendering arrays of elements

## State Management

- Never lift state higher than necessary; keep it close to where it's used
- Never store derived state; compute it during render
- Never use useReducer for simple state; avoid it for trivial state unless testing or action semantics are needed
- Never pass too many props through components; consider context or composition

## Performance

- Never create new object or array literals in props; causes unnecessary re-renders
- Never use inline function definitions in JSX for frequently re-rendered components
- Never forget to memoize expensive computations with useMemo
- Never wrap everything in React.memo; profile first to identify actual bottlenecks
