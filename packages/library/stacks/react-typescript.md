---
name: react-typescript
description: React and TypeScript specific pattern constraints
tags:
  - react
  - typescript
  - frontend
priority: 2
globs: "**/*.{ts,tsx}"
---

- **NEVER** use `any` type in TypeScript; use `unknown` if the type is truly dynamic. Reasoning: `any` disables type checking, defeating the purpose of TypeScript.
- **NEVER** use barrel files (`index.ts`) for internal component folders; it breaks tree-shaking. Reasoning: Barrel files can cause circular dependencies and bloat bundle sizes.
- **NEVER** use `useEffect` for data fetching; use TanStack Query or Server Components. Reasoning: `useEffect` fetching forces waterfalls and race conditions.
- **NEVER** use inline styles; use Tailwind CSS classes exclusively. Reasoning: Inline styles perform worse and break the design system consistency.
- **NEVER** create a component over 150 lines; break it into sub-components. Reasoning: Large components are hard to test, read, and maintain.
- **NEVER** use px values in Tailwind; use relative units like rem (e.g., `w-4` instead of `w-[16px]`). Reasoning: Relative units respect user accessibility settings and scale better.
- **NEVER** use `localStorage` for sensitive state; use a secure store or cookies. Reasoning: `localStorage` is accessible to XSS attacks.
- **NEVER** use Default Exports; always use Named Exports for better refactoring. Reasoning: Named exports enforce consistent naming and work better with auto-imports.
- **NEVER** use `React.FC` or `React.FunctionalComponent` types. Reasoning: These types are legacy and add unnecessary overhead to component definitions.
- **NEVER** include `console.log` in production-bound code. Reasoning: Debug logs leak info and clutter the browser console.
- **NEVER** use `document.getElementById` in React; use refs. Reasoning: Direct DOM manipulation bypasses React's virtual DOM and lifecycle.
