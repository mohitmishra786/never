---
name: FastAPI Best Practices
description: Constraints for FastAPI Python web framework development
tags: [fastapi, python, api, pydantic, backend]
globs: "**/*.py"
alwaysApply: false
---

# FastAPI Constraints

## Pydantic Models

- **Never** use `dict` as request/response type; define Pydantic models
- **Never** use `Any` type in model fields without explicit validation
- **Never** allow arbitrary types without `Config.arbitrary_types_allowed`
- **Always** use `Field()` for validation constraints and descriptions
- **Always** define separate models for Create, Update, and Response schemas
- **Always** use `Config.from_attributes = True` for ORM model conversion

## Route Handlers

- **Never** put business logic directly in route handlers; use service layer
- **Never** use `async def` without actual async operations; use `def` instead
- **Never** return SQLAlchemy/ORM models directly; convert to Pydantic models
- **Always** use type hints for all parameters and return types
- **Always** specify response_model for automatic serialization and docs
- **Always** use appropriate HTTP status codes with `status_code` parameter

## Dependency Injection

- **Never** instantiate database sessions manually in routes
- **Never** use global mutable state for request-scoped data
- **Always** use `Depends()` for database sessions, auth, and shared logic
- **Always** use `yield` dependencies for cleanup (database sessions)
- **Always** cache expensive dependencies with `@lru_cache`

## Authentication and Security

- **Never** store passwords in plain text; use `passlib` with bcrypt
- **Never** include secrets in response models
- **Never** trust client-provided user IDs; extract from JWT
- **Always** use `OAuth2PasswordBearer` or custom security dependencies
- **Always** validate JWT tokens on every protected route
- **Always** use HTTPS in production

## Error Handling

- **Never** return raw exceptions to clients
- **Never** use bare `except:` clauses
- **Always** use `HTTPException` with appropriate status codes
- **Always** define custom exception handlers for domain errors
- **Always** include detail messages that help debugging without exposing internals

## Database Operations

- **Never** use synchronous ORM in async routes; use async drivers or run_in_threadpool
- **Never** commit transactions in utility functions; let the route handler manage
- **Never** execute N+1 queries; use eager loading or joinedload
- **Always** use dependency injection for database sessions
- **Always** handle `IntegrityError` and `NoResultFound` explicitly

## Request Validation

- **Never** use `request.json()` directly; use Pydantic models
- **Never** skip validation for file uploads
- **Always** use `Path()`, `Query()`, `Body()` for parameter documentation
- **Always** validate enum values with `Literal` or `Enum`
- **Always** use `constr()`, `conint()`, etc. for constrained types

## Background Tasks

- **Never** run long operations in route handlers; use `BackgroundTasks`
- **Never** access request context in background tasks; pass data explicitly
- **Always** handle exceptions in background tasks; they fail silently

## Documentation

- **Never** leave endpoints without descriptions and examples
- **Always** use `summary` and `description` parameters on routes
- **Always** provide example values in Pydantic models
- **Always** tag endpoints for logical grouping in OpenAPI docs

## Testing

- **Never** test against production database
- **Always** use `TestClient` for synchronous tests
- **Always** use `httpx.AsyncClient` for async tests
- **Always** override dependencies in tests with `app.dependency_overrides`
