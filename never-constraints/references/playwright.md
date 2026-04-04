---
name: Playwright Best Practices
description: Constraints for Playwright end-to-end testing
tags: [playwright, testing, e2e, automation, browser]
globs: "**/*.{spec,test}.{ts,js}"
alwaysApply: false
---

# Playwright Constraints

## Locators

- **Never** use CSS selectors based on styling classes; they change frequently
- **Never** use XPath unless absolutely necessary; prefer user-facing selectors
- **Never** use `page.$()` or `page.$$()` for interactions; use locators
- **Never** use fragile selectors like `nth-child` or positional indexes
- **Always** prefer `getByRole()`, `getByText()`, `getByLabel()`, `getByTestId()`
- **Always** use `data-testid` attributes for elements without semantic roles
- **Always** chain locators for specificity: `page.getByRole('list').getByRole('listitem')`

## Page Object Model

- **Never** put assertions in page objects; only actions and locators
- **Never** expose locators directly; wrap them in meaningful methods
- **Always** use page objects for reusable page interactions
- **Always** return page objects from navigation methods for chaining
- **Always** keep page objects focused on a single page or component

## Waiting and Synchronization

- **Never** use `page.waitForTimeout()` for synchronization; use auto-waiting
- **Never** use `setTimeout` or `sleep` in tests
- **Always** rely on Playwright's built-in auto-waiting
- **Always** use `expect(locator).toBeVisible()` for explicit waits when needed
- **Always** use `page.waitForResponse()` when waiting for API calls

## Assertions

- **Never** use raw Jest/Node assertions; use Playwright's `expect`
- **Never** assert on implementation details; assert on user-visible outcomes
- **Always** use web-first assertions: `expect(locator).toHaveText()`
- **Always** test from the user's perspective
- **Always** include negative test cases (error states, edge cases)

## Test Organization

- **Never** create dependencies between test files
- **Never** share state between tests without explicit fixtures
- **Never** run tests in a specific order; each test should be independent
- **Always** use `describe` blocks to group related tests
- **Always** use `beforeEach` and `afterEach` for setup and cleanup
- **Always** keep tests focused and atomic

## Fixtures

- **Never** use global state; use fixtures for shared setup
- **Never** repeat setup code across tests; extract to fixtures
- **Always** use worker fixtures for expensive setup (database, auth)
- **Always** use test fixtures for per-test isolation
- **Always** clean up after fixtures with proper teardown

## Authentication

- **Never** log in through the UI in every test; use storage state
- **Always** use `storageState` to reuse authentication across tests
- **Always** set up auth in a global setup file

## API Testing

- **Never** mock APIs when testing API integrations
- **Always** use `request` fixture for API-only tests
- **Always** validate response schemas and status codes

## Configuration

- **Never** hardcode base URLs; use `playwright.config.ts`
- **Always** configure retries for flaky test handling
- **Always** use projects for cross-browser testing
- **Always** configure appropriate timeouts per project

## Debugging

- **Never** commit `test.only()` or `.skip()` without reason
- **Always** use `npx playwright test --ui` for debugging
- **Always** generate and review trace files for failures
- **Always** use `page.pause()` for interactive debugging
