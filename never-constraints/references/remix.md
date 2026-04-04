---
name: Remix Best Practices
description: Constraints for Remix full-stack web framework development
tags: [remix, react, fullstack, web, ssr]
globs: "**/*.{tsx,jsx,ts,js}"
alwaysApply: false
---

# Remix Constraints

## Loaders

- **Never** fetch data on the client when loaders can provide it
- **Never** return sensitive data from loaders; filter on the server
- **Never** use `useEffect` to fetch data available from loaders
- **Always** use `loader` functions for page data requirements
- **Always** return typed responses with `json()` helper
- **Always** handle authentication and authorization in loaders

## Actions

- **Never** mutate data with GET requests; use POST/PUT/DELETE
- **Never** skip validation in action handlers
- **Never** redirect without returning a response
- **Always** use `action` functions for form submissions
- **Always** return proper status codes and redirect after mutations
- **Always** validate and sanitize all action input

## Forms

- **Never** use controlled inputs when uncontrolled work; leverage native forms
- **Never** prevent default form submission without reason
- **Always** use `<Form>` component instead of `<form>` for navigation
- **Always** use `<fetcher.Form>` for non-navigating mutations
- **Always** handle pending UI states with `useNavigation`

## Error Handling

- **Never** throw errors without error boundaries
- **Never** show raw error messages to users
- **Always** implement `ErrorBoundary` exports in routes
- **Always** implement `CatchBoundary` for expected errors (404, 403)
- **Always** log errors server-side with context

## Progressive Enhancement

- **Never** assume JavaScript is available
- **Never** break core functionality without JS
- **Always** ensure forms work without JavaScript first
- **Always** add JavaScript enhancements progressively
- **Always** test with JavaScript disabled

## Route Organization

- **Never** create deeply nested routes without clear purpose
- **Always** use route file naming conventions consistently
- **Always** use `_index.tsx` for index routes
- **Always** use dot notation for nested layouts (`routes/dashboard.settings.tsx`)

## Data Loading Patterns

- **Never** waterfall data requests; load in parallel
- **Always** use `defer` for slow data with streaming
- **Always** use `Await` component with loading fallbacks
- **Always** prefetch links with `<Link prefetch="intent">`

## Sessions and Auth

- **Never** store sensitive data in cookies without encryption
- **Never** trust client-side auth state alone
- **Always** use `createCookieSessionStorage` or similar
- **Always** verify session in loaders for protected routes
- **Always** set secure cookie options in production

## TypeScript

- **Never** use `any` for loader and action return types
- **Always** type loader data with `LoaderFunctionArgs`
- **Always** use `useLoaderData<typeof loader>()` for type inference
- **Always** define types for form data and action responses

## Performance

- **Never** load unnecessary JavaScript in routes
- **Always** use HTTP caching headers appropriately
- **Always** minimize client bundle with route-based code splitting
- **Always** use streaming for large responses

## Testing

- **Never** skip testing loaders and actions
- **Always** test routes with `createRemixStub` or integration tests
- **Always** mock external services in tests
