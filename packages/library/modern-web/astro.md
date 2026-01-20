---
name: Astro Best Practices
description: Constraints for Astro static site and hybrid framework development
tags: [astro, ssg, javascript, web, islands]
globs: "**/*.astro"
alwaysApply: false
---

# Astro Constraints

## Island Architecture

- **Never** hydrate components that do not need interactivity
- **Never** use client directives on static content
- **Never** load entire frameworks for simple interactions
- **Always** use `client:visible` for below-fold interactive components
- **Always** prefer `client:idle` over `client:load` for non-critical interactivity
- **Always** use `client:only` when SSR is not possible for a component

## Content Collections

- **Never** use raw Markdown files when Content Collections can validate
- **Never** skip schema validation for content types
- **Always** define schemas with Zod in `src/content/config.ts`
- **Always** use `getCollection()` and `getEntry()` for type-safe content access
- **Always** use frontmatter slugs consistently

## Component Structure

- **Never** mix framework components without clear boundaries
- **Never** use framework-specific state as the primary data source
- **Always** keep Astro components for layout and structure
- **Always** use slots for flexible composition
- **Always** minimize JavaScript in Astro frontmatter

## Styling

- **Never** use global styles that can conflict with component styles
- **Always** use scoped styles in Astro components by default
- **Always** use `is:global` sparingly for necessary global styles
- **Always** prefer CSS variables for theming

## Data Fetching

- **Never** fetch data on the client when it can be fetched at build time
- **Never** make API calls in component render without caching
- **Always** fetch data in Astro frontmatter for static pages
- **Always** use `Astro.cookies` and `Astro.request` for SSR needs
- **Always** cache external API responses during build

## Performance

- **Never** import unused framework adapters
- **Never** bundle large libraries without code splitting
- **Always** use image optimization with `@astrojs/image` or native `<Image />`
- **Always** prefetch critical pages with `<link rel="prefetch">`
- **Always** analyze bundle size with `astro build --analyze`

## SEO and Metadata

- **Never** hardcode meta tags across pages; use a shared component
- **Always** use `<head>` in layouts for consistent metadata
- **Always** generate sitemaps with `@astrojs/sitemap`
- **Always** provide Open Graph and Twitter meta tags

## Routing

- **Never** create dynamic routes without `getStaticPaths` for SSG
- **Always** use file-based routing consistently
- **Always** define 404 pages at `src/pages/404.astro`
- **Always** use `[...slug].astro` for catch-all routes

## Integrations

- **Never** add integrations without understanding their impact on build
- **Always** configure integrations in `astro.config.mjs`
- **Always** update integrations regularly for compatibility

## Testing

- **Never** deploy without testing builds locally
- **Always** run `astro check` for TypeScript validation
- **Always** test responsive layouts across breakpoints
