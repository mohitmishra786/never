---
name: NestJS Best Practices
description: Constraints for NestJS framework development
tags: [nestjs, nodejs, typescript, backend, api]
globs: "**/*.ts"
alwaysApply: false
---

# NestJS Constraints

## Controllers

- **Never** put business logic in controllers; delegate to services
- **Never** inject more than 5 dependencies into a controller; refactor if needed
- **Never** return raw database entities; use DTOs or serializers
- **Never** use `@Res()` decorator unless absolutely necessary; it disables interceptors
- **Always** use versioning for API endpoints in production
- **Always** define route-specific DTOs for request validation
- **Always** use `@HttpCode()` for non-200 success responses

## Providers and Services

- **Never** use `any` type in service method signatures
- **Never** catch and swallow exceptions silently; log or rethrow
- **Never** create tightly coupled services; use interfaces for abstraction
- **Always** mark services with `@Injectable()` decorator
- **Always** use constructor injection over property injection
- **Always** keep services focused on a single responsibility

## Modules

- **Never** import modules circularly; use `forwardRef()` only as last resort
- **Never** export providers that are internal implementation details
- **Never** put all code in a single module; organize by feature
- **Always** create feature modules with their own controllers, services, and DTOs
- **Always** use `@Global()` sparingly; prefer explicit imports
- **Always** list all providers, controllers, imports, and exports explicitly

## Dependency Injection

- **Never** use `new` keyword for injectable classes; let DI container manage them
- **Never** access the DI container directly in production code
- **Always** use custom providers for third-party libraries
- **Always** scope providers appropriately (singleton, request, transient)

## DTOs and Validation

- **Never** use entity classes as DTOs; create separate classes
- **Never** skip validation on incoming data
- **Always** use `class-validator` decorators on DTO properties
- **Always** use `class-transformer` with `@Exclude()` for sensitive fields
- **Always** implement `ValidationPipe` globally or per-controller

## Guards and Middleware

- **Never** use guards for business logic; use only for authorization
- **Never** perform database queries in middleware
- **Always** place authentication guards before authorization guards
- **Always** use canActivate for route protection

## Interceptors

- **Never** modify response structure inconsistently across endpoints
- **Always** use interceptors for cross-cutting concerns (logging, caching, transformation)
- **Always** handle both success and error cases in interceptors

## Exception Handling

- **Never** expose stack traces or internal errors to clients in production
- **Never** throw generic `Error`; use NestJS built-in exceptions
- **Always** implement an exception filter for consistent error responses
- **Always** include error codes for client-side handling

## Database

- **Never** execute raw SQL without parameterized queries
- **Never** load entire tables without pagination
- **Always** use transactions for multi-step database operations
- **Always** implement repository pattern or use TypeORM/Prisma repositories

## Testing

- **Never** skip unit tests for services
- **Always** mock external dependencies in unit tests
- **Always** use the testing module for e2e tests
- **Always** test both success and error paths
