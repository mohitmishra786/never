---
name: Flutter Best Practices
description: Constraints for Flutter cross-platform development
tags: [flutter, dart, mobile, ios, android]
globs: "**/*.dart"
alwaysApply: false
---

# Flutter Constraints

## Widget Composition

- **Never** create deeply nested widget trees; extract into separate widgets
- **Never** put business logic inside build methods
- **Never** use StatefulWidget when StatelessWidget suffices
- **Always** keep widgets small and focused on one responsibility
- **Always** use const constructors for immutable widgets
- **Always** prefer composition over inheritance for widget reuse

## State Management

- **Never** use setState for complex or shared state
- **Never** rebuild entire widget trees for localized state changes
- **Never** store derived state; compute it from source state
- **Always** use state management (Provider, Riverpod, Bloc) for complex apps
- **Always** scope state providers as narrowly as possible
- **Always** separate UI state from business logic

## Performance

- **Never** call setState in build method
- **Never** use `print()` in production; it impacts performance
- **Never** create unnecessary widget rebuilds
- **Always** use `const` keyword for static widgets
- **Always** use `ListView.builder` for long lists, not `Column` with children
- **Always** profile with Flutter DevTools before optimizing

## Layout

- **Never** hardcode dimensions; use responsive layouts
- **Never** nest `Column` inside `Column` without `Expanded` or `Flexible`
- **Never** use `MediaQuery` in build without caching
- **Always** use `Expanded` and `Flexible` in Row/Column layouts
- **Always** use `LayoutBuilder` for responsive widget sizing
- **Always** handle overflow with `SingleChildScrollView` or clipping

## Platform Channels

- **Never** block the main isolate with heavy computation
- **Never** pass large data synchronously through channels
- **Always** use async method channels
- **Always** handle platform exceptions gracefully
- **Always** test platform-specific code on real devices

## Navigation

- **Never** push routes without proper back handling
- **Never** use string-based routing for complex navigation
- **Always** use Navigator 2.0 or go_router for complex navigation
- **Always** type-check route arguments
- **Always** handle deep links consistently

## Assets and Images

- **Never** use network images without placeholders and error handling
- **Never** bundle unoptimized images
- **Always** use `cached_network_image` for remote images
- **Always** provide multiple asset resolutions (1x, 2x, 3x)
- **Always** preload critical images during splash screen

## Error Handling

- **Never** swallow exceptions without logging
- **Never** show raw error messages to users
- **Always** use custom error widgets with `ErrorWidget.builder`
- **Always** implement crash reporting (Firebase Crashlytics, Sentry)
- **Always** use `try-catch` for async operations

## Testing

- **Never** skip widget tests for critical UI components
- **Always** use `WidgetTester` for widget testing
- **Always** test golden images for visual regression
- **Always** use integration tests for critical user flows
- **Always** mock dependencies with `mocktail` or `mockito`

## Code Organization

- **Never** mix feature code across directories
- **Always** organize by feature, not by type
- **Always** separate data, domain, and presentation layers
- **Always** use dependency injection for testability

## Null Safety

- **Never** use `!` operator without null check
- **Never** use `late` without guaranteed initialization
- **Always** handle nullable types explicitly
- **Always** use null-aware operators appropriately
