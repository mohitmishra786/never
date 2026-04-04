---
name: Cypress Best Practices
description: Constraints for Cypress end-to-end and component testing
tags: [cypress, testing, e2e, automation, browser]
globs: "**/*.cy.{ts,js}"
alwaysApply: false
---

# Cypress Constraints

## Selectors

- **Never** use selectors based on CSS styling; classes change frequently
- **Never** use fragile selectors like `:nth-child()` or tag names alone
- **Never** select by text that changes based on i18n
- **Always** use `data-cy`, `data-test`, or `data-testid` attributes
- **Always** prefer selecting by accessible roles when possible
- **Always** use `cy.contains()` for user-visible text when stable

## Commands and Chaining

- **Never** use `cy.wait()` with arbitrary numbers; use aliases or intercepts
- **Never** mix async/await with Cypress commands; use chaining
- **Never** store Cypress command results in variables; use aliases
- **Always** chain commands for readability
- **Always** use `.then()` for accessing yielded values
- **Always** use `cy.wrap()` when working with non-Cypress values

## Custom Commands

- **Never** create overly generic custom commands
- **Never** duplicate Cypress built-in functionality
- **Always** add TypeScript definitions for custom commands
- **Always** name commands descriptively: `cy.loginAsAdmin()`
- **Always** keep commands focused on a single action

## Network Handling

- **Never** rely on real network responses for unit-style tests
- **Never** use `cy.wait(1000)` for network; use `cy.intercept()` aliases
- **Always** use `cy.intercept()` to stub or spy on network requests
- **Always** alias intercepts and wait with `cy.wait('@alias')`
- **Always** test both success and error API responses

## Assertions

- **Never** assert on internal implementation details
- **Never** use multiple unrelated assertions in one test
- **Always** use Chai-jQuery assertions for DOM elements
- **Always** assert on the user-visible outcome
- **Always** use `.should()` for retrying assertions

## Test Organization

- **Never** create dependencies between test files
- **Never** rely on test execution order
- **Always** isolate tests using `beforeEach` hooks
- **Always** use `describe` blocks for logical grouping
- **Always** keep tests atomic and independent

## Fixtures and Data

- **Never** hardcode test data in test files; use fixtures
- **Never** share state between tests without explicit setup
- **Always** use `cy.fixture()` for static test data
- **Always** reset database/state in `before` or `beforeEach`
- **Always** use factories for dynamic test data

## Authentication

- **Never** go through login UI for every test
- **Always** use `cy.session()` to cache and restore sessions
- **Always** set cookies/localStorage directly for faster auth

## Component Testing

- **Never** mount components without necessary providers
- **Always** use `cy.mount()` for component testing
- **Always** test component variations and edge cases
- **Always** mock external dependencies

## Configuration

- **Never** hardcode environment-specific values
- **Always** use `cypress.config.ts` for configuration
- **Always** use environment variables for sensitive data
- **Always** set appropriate viewport sizes for responsive testing

## Debugging

- **Never** commit `.only()` or `.skip()` without commented reason
- **Always** use `cy.log()` for debugging information
- **Always** use `.debug()` for interactive debugging
- **Always** review screenshots and videos on failures
