---
name: Svelte Best Practices
description: Constraints for Svelte and SvelteKit development
tags: [svelte, sveltekit, javascript, web, frontend]
globs: "**/*.svelte"
alwaysApply: false
---

# Svelte Constraints

## Reactivity

- **Never** mutate objects/arrays without reassignment; reactivity requires it
- **Never** use `let` for values that should be `const`
- **Never** create reactive statements that cause infinite loops
- **Always** use `$:` reactive declarations for derived values
- **Always** reassign arrays/objects to trigger updates: `arr = [...arr, item]`
- **Always** use stores for shared/global state

## Components

- **Never** create components larger than 200 lines; split them up
- **Never** use `$$props` or `$$restProps` without clear need
- **Always** define `export let` for component props
- **Always** use slots for flexible content composition
- **Always** emit events with `createEventDispatcher`

## Stores

- **Never** access store values without `$` prefix in templates
- **Never** forget to unsubscribe from custom subscriptions
- **Never** put async logic directly in stores
- **Always** use writable, readable, and derived appropriately
- **Always** use `$store` syntax for auto-subscription
- **Always** create custom stores for complex state logic

## Bindings

- **Never** overuse two-way bindings; they can cause unexpected updates
- **Never** bind to deeply nested properties
- **Always** use `bind:value` for form inputs
- **Always** use `bind:this` sparingly for DOM access
- **Always** prefer events over bindings for parent-child communication

## Lifecycle

- **Never** access DOM before `onMount`
- **Never** forget cleanup in lifecycle hooks
- **Always** use `onMount` for browser-only code
- **Always** return cleanup functions from lifecycle hooks
- **Always** use `onDestroy` for cleanup that must happen

## SvelteKit Routing

- **Never** use client-side navigation for server-required actions
- **Never** expose sensitive data from server load functions
- **Always** use `+page.server.ts` for sensitive data loading
- **Always** use `+layout.svelte` for shared UI
- **Always** define load functions for data requirements

## SvelteKit Forms

- **Never** skip form validation on the server
- **Never** trust client-side validation alone
- **Always** use form actions for mutations
- **Always** return proper form validation errors
- **Always** use `enhance` for progressive enhancement

## Styling

- **Never** rely on global styles leaking into components
- **Always** use scoped styles by default
- **Always** use `:global()` sparingly for external elements
- **Always** use CSS variables for theming

## Performance

- **Never** render large lists without virtualization (svelte-virtual-list)
- **Never** import entire libraries for small utilities
- **Always** use `{#key}` blocks to force component recreation
- **Always** use `{#await}` for async data in templates
- **Always** analyze bundle size with `vite-plugin-inspect`

## Transitions and Animations

- **Never** animate on page load without user preference check
- **Always** use `transition:`, `in:`, `out:` directives
- **Always** respect `prefers-reduced-motion`
- **Always** use `animate:` for list reordering

## TypeScript

- **Never** use `any` for prop types
- **Always** enable `lang="ts"` in script blocks
- **Always** type component props and events
- **Always** use `satisfies` for type checking objects

## Testing

- **Never** skip component testing
- **Always** use `@testing-library/svelte` for component tests
- **Always** test reactive behavior with state changes
- **Always** use Playwright for E2E testing with SvelteKit
