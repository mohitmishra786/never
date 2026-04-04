---
name: React Native Best Practices
description: Constraints for React Native mobile development
tags: [react-native, mobile, ios, android, javascript]
globs: "**/*.{tsx,jsx,ts,js}"
alwaysApply: false
---

# React Native Constraints

## Performance

- **Never** use inline functions in render; they cause unnecessary re-renders
- **Never** pass arrow functions directly to event handlers in lists
- **Never** use `console.log` in production; it causes performance issues
- **Never** use index as key in FlatList; use unique identifiers
- **Always** use `useCallback` for functions passed to child components
- **Always** use `useMemo` for expensive computations
- **Always** use `React.memo()` for pure functional components

## FlatList Optimization

- **Never** use `ScrollView` for long lists; use `FlatList` or `SectionList`
- **Never** render all items in a large list; use virtualization
- **Always** implement `getItemLayout` when item heights are known
- **Always** use `keyExtractor` with unique stable identifiers
- **Always** set `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`
- **Always** use `removeClippedSubviews` for off-screen item optimization

## Styling

- **Never** create StyleSheet objects inside components; define outside
- **Never** use inline styles for complex styling
- **Never** mix styled-components and StyleSheet inconsistently
- **Always** use `StyleSheet.create()` for performance optimizations
- **Always** use absolute positioning sparingly; prefer flexbox
- **Always** avoid shadows on Android; use elevation instead

## Images

- **Never** use large unoptimized images; compress before bundling
- **Never** use remote images without placeholders
- **Always** use `resizeMode` appropriately
- **Always** cache remote images using libraries like `react-native-fast-image`
- **Always** provide width and height for remote images

## Navigation

- **Never** store navigation state in Redux/global state
- **Never** use deep nesting of navigators without need
- **Always** use React Navigation or Expo Router
- **Always** type navigation props with TypeScript
- **Always** use `useFocusEffect` for screen-specific effects

## State Management

- **Never** use Redux for simple local state; use useState/useReducer
- **Never** store derived state; compute it in render or useMemo
- **Always** use context for theme and auth; use state managers for complex state
- **Always** normalize nested data in stores
- **Always** use selectors to prevent unnecessary re-renders

## Native Modules

- **Never** block the JS thread with heavy native calls
- **Never** pass large amounts of data across the bridge synchronously
- **Always** use TurboModules for new native modules (New Architecture)
- **Always** batch bridge communications when possible
- **Always** use JSI for performance-critical native interactions

## Platform-Specific Code

- **Never** assume iOS behavior works on Android; test both
- **Never** use platform-specific APIs without proper checks
- **Always** use `Platform.select()` for platform-specific values
- **Always** use `.ios.tsx` and `.android.tsx` for divergent implementations
- **Always** test on real devices, not just simulators

## Error Handling

- **Never** let errors crash the app silently
- **Always** use error boundaries for component trees
- **Always** implement global error handlers with crash reporting
- **Always** handle network errors gracefully with retry logic

## Animations

- **Never** animate on the JS thread for complex animations
- **Always** use `react-native-reanimated` for performant animations
- **Always** use native driver (`useNativeDriver: true`) when possible
- **Always** keep animations at 60fps; profile with Perf Monitor

## Testing

- **Never** skip testing on real devices
- **Always** use React Native Testing Library for component tests
- **Always** use E2E testing (Detox, Maestro) for critical flows
- **Always** mock native modules in unit tests
