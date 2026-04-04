---
name: Django Best Practices
description: Constraints for Django web framework development
tags: [django, python, backend, orm, web]
globs: "**/*.py"
alwaysApply: false
---

# Django Constraints

## Models

- **Never** use `null=True` on CharField or TextField; use `blank=True` with default=""
- **Never** define business logic in models that depends on request context
- **Never** use `ForeignKey` without specifying `on_delete`
- **Never** access `request` or session data in model methods
- **Always** add `db_index=True` to fields used in filters and lookups
- **Always** use `related_name` for ForeignKey and ManyToMany fields
- **Always** define `__str__` method for admin readability

## Migrations

- **Never** edit migrations that have been applied to production
- **Never** delete migrations; create new ones to undo changes
- **Never** make data migrations in the same file as schema migrations
- **Always** run `makemigrations --check` in CI to catch missing migrations
- **Always** review auto-generated migrations before committing
- **Always** use `RunPython.noop` for reverse migration when appropriate

## Views and URLs

- **Never** put database queries in templates; prepare data in views
- **Never** use function-based views for complex logic; use class-based views
- **Never** hardcode URLs; use `reverse()` or `{% url %}` tag
- **Always** use `get_object_or_404()` instead of manual exception handling
- **Always** return proper HTTP status codes for API views
- **Always** use `LoginRequiredMixin` or `@login_required` for protected views

## QuerySets and ORM

- **Never** use `.all()` without limiting results in views
- **Never** evaluate QuerySets in loops; use `select_related()` and `prefetch_related()`
- **Never** use `len(queryset)` for counting; use `.count()`
- **Never** use `.get()` without try/except or `get_object_or_404`
- **Always** use `.only()` or `.defer()` for large models
- **Always** use `.exists()` instead of `if queryset:` for boolean checks
- **Always** use `F()` and `Q()` objects for complex queries

## Forms

- **Never** trust user input without cleaning; use form validation
- **Never** save forms without calling `is_valid()` first
- **Always** use ModelForm for model-based forms
- **Always** implement `clean_<field>` methods for field-specific validation
- **Always** use CSRF protection for all forms

## Security

- **Never** use `|safe` filter on user-provided content without sanitization
- **Never** interpolate user input into raw SQL; use ORM or parameterized queries
- **Never** store secrets in `settings.py`; use environment variables
- **Always** set `ALLOWED_HOSTS` in production
- **Always** use `django.contrib.auth` for authentication
- **Always** apply permission classes to API views

## Admin

- **Never** expose admin in production without IP restrictions or 2FA
- **Never** use admin for end-user-facing functionality
- **Always** customize admin display with `list_display`, `list_filter`, `search_fields`
- **Always** use `readonly_fields` for computed or sensitive fields

## Templates

- **Never** embed Python logic in templates; use template tags and filters
- **Never** load heavy data in template tags; pass from views
- **Always** use template inheritance with `{% extends %}` and `{% block %}`
- **Always** escape user content by default; Django does this automatically

## Performance

- **Never** make database queries in loops
- **Always** use `select_related` for ForeignKey traversals in loops
- **Always** use `prefetch_related` for ManyToMany and reverse FK
- **Always** cache expensive queries using Django cache framework

## Testing

- **Never** test against the production database
- **Always** use `TestCase` or `TransactionTestCase` for database tests
- **Always** use `Client` or `APIClient` for view tests
- **Always** use factories (factory_boy) instead of fixtures for test data
