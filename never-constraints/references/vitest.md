---
name: Vitest Best Practices
description: Constraints for Vitest unit and integration testing
tags: [vitest, testing, unit, javascript, typescript]
globs: "**/*.{spec,test}.{ts,js}"
alwaysApply: false
---

# Vitest Constraints

## Test Structure

- **Never** use `test.only()` or `describe.only()` in committed code
- **Never** create tests that depend on execution order
- **Never** share mutable state between tests
- **Always** use `describe` blocks to group related tests
- **Always** write descriptive test names that explain the expected behavior
- **Always** follow the Arrange-Act-Assert (AAA) pattern

## Assertions

- **Never** use multiple unrelated assertions in one test
- **Never** write assertions that always pass
- **Always** use specific matchers: `toEqual`, `toStrictEqual`, `toContain`
- **Always** test both positive and negative cases
- **Always** assert on error messages and types, not just that errors are thrown

## Mocking

- **Never** mock what you do not own without clear documentation
- **Never** leave mocks in place across tests; reset in `beforeEach` or `afterEach`
- **Never** mock implementation details; mock boundaries (APIs, databases)
- **Always** use `vi.mock()` at the module level for ES modules
- **Always** use `vi.spyOn()` for observing calls without changing behavior
- **Always** call `vi.restoreAllMocks()` in `afterEach` when using spies

## Async Testing

- **Never** use `done` callback when async/await is available
- **Never** forget to await promises in async tests
- **Always** use async/await for asynchronous tests
- **Always** set appropriate timeouts for slow async operations
- **Always** use `vi.waitFor()` for testing async state changes

## Coverage

- **Never** aim for 100% coverage at the expense of meaningful tests
- **Never** write tests just to hit coverage thresholds
- **Always** focus coverage on critical business logic
- **Always** configure coverage thresholds in vitest.config.ts
- **Always** exclude test files and generated code from coverage

## Snapshot Testing

- **Never** use snapshots for frequently changing output
- **Never** blindly update snapshots without reviewing changes
- **Always** keep snapshots small and focused
- **Always** use inline snapshots for short expected values
- **Always** review snapshot diffs in pull requests

## Setup and Teardown

- **Never** perform heavy setup in `beforeEach` that can be in `beforeAll`
- **Never** skip cleanup; leaked state causes flaky tests
- **Always** use `beforeEach` for test-specific setup
- **Always** use `afterEach` to reset mocks and cleanup
- **Always** use `beforeAll`/`afterAll` for expensive one-time setup

## Test Files

- **Never** put test files far from source files; co-locate when possible
- **Always** use `.test.ts` or `.spec.ts` extension consistently
- **Always** mirror source file structure in test organization
- **Always** import from source using the same paths as production code

## Performance

- **Never** run expensive operations in tests without isolation
- **Always** use `vi.useFakeTimers()` for time-dependent code
- **Always** run tests in parallel when possible (default in Vitest)
- **Always** use in-source testing for tiny utility functions

## Debugging

- **Never** leave `console.log` statements in committed tests
- **Always** use `test.todo()` for planned tests
- **Always** use `--reporter=verbose` for debugging failures
- **Always** use `--inspect-brk` for debugger attachment
