---
name: React with TypeScript
description: React and TypeScript specific pattern constraints for type-safe frontends
tags: [react, typescript, frontend]
globs: "**/*.{ts,tsx}"
alwaysApply: false
---

# React with TypeScript Constraints

## Type Safety

- **Never** use `any` type in TypeScript; use `unknown` if the type is truly dynamic to maintain type safety
- **Never** use `React.FC` or `React.FunctionalComponent` types; these are legacy and add unnecessary overhead

## Component Architecture

- **Never** create a component over 150 lines; break it into sub-components for better testability
- **Never** use barrel files (`index.ts`) for internal component folders; it breaks tree-shaking and creates circular dependencies

## Data Fetching

- **Never** use `useEffect` for data fetching; use TanStack Query or Server Components to avoid waterfalls

## Styling

- **Never** use inline styles; use Tailwind CSS classes exclusively for consistency
- **Never** use px values in Tailwind; use relative units like rem for better accessibility

## Security

- **Never** use `localStorage` for sensitive state; use secure stores or httpOnly cookies
- **Never** use `document.getElementById` in React; use refs to work with React's virtual DOM

## Code Standards

- **Never** use Default Exports; always use Named Exports for better refactoring support
- **Never** include `console.log` in production-bound code; use proper logging libraries
