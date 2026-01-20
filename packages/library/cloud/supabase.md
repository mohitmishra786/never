---
name: Supabase Best Practices
description: Constraints for Supabase backend-as-a-service development
tags: [supabase, postgres, auth, database, backend]
globs: "**/*.{ts,tsx,js,sql}"
alwaysApply: false
---

# Supabase Constraints

## Row Level Security (RLS)

- **Never** disable RLS on tables containing user data; it is the primary security layer
- **Never** use `SECURITY DEFINER` functions without understanding privilege escalation risks
- **Never** create policies with `USING (true)` on sensitive tables
- **Always** enable RLS immediately after creating any new table
- **Always** test RLS policies with different user contexts before deployment
- **Always** use `auth.uid()` to scope queries to the authenticated user

## Authentication

- **Never** store passwords or hash them yourself; use Supabase Auth exclusively
- **Never** expose service role key in client-side code; it bypasses RLS
- **Never** use the anon key for admin operations
- **Always** use `supabase.auth.getUser()` to verify JWT on the server
- **Always** configure email templates and redirect URLs in the dashboard
- **Always** enable email confirmation for production apps

## Database Schema

- **Never** use `serial` or `bigserial` for primary keys; use `uuid` with `gen_random_uuid()`
- **Never** create tables without timestamps (`created_at`, `updated_at`)
- **Never** store files in database columns; use Supabase Storage
- **Always** add foreign key constraints with appropriate ON DELETE behavior
- **Always** create indexes on columns used in WHERE clauses and joins
- **Always** use `timestamptz` instead of `timestamp` for timezone awareness

## Storage

- **Never** make buckets public unless files are truly meant for unauthenticated access
- **Never** allow unrestricted file uploads; validate MIME types and sizes
- **Always** use signed URLs for temporary access to private files
- **Always** organize files with consistent path structures: `{bucket}/{user_id}/{resource_type}/{filename}`
- **Always** set appropriate bucket policies for upload/download permissions

## Edge Functions

- **Never** expose secrets in Edge Function responses
- **Never** trust client-provided data without validation
- **Always** use `Deno.env.get()` to access secrets
- **Always** handle CORS appropriately for browser requests
- **Always** return appropriate HTTP status codes

## Client Library

- **Never** create multiple Supabase client instances; use a singleton
- **Never** chain `.single()` on queries that might return multiple rows
- **Always** handle errors from all Supabase operations
- **Always** use TypeScript types generated from the database schema
- **Always** use `.select()` to specify columns instead of selecting all

## Realtime

- **Never** subscribe to entire tables in production; use filters
- **Never** leave subscriptions open after component unmounts
- **Always** unsubscribe in cleanup functions
- **Always** handle connection state changes

## Performance

- **Never** fetch more data than needed; use pagination with `.range()`
- **Never** run queries in loops; use batch operations or joins
- **Always** use database functions for complex operations
- **Always** consider using Postgres views for complex queries

## Migrations

- **Never** modify migrations that have been applied to production
- **Never** delete data without a backup strategy
- **Always** use the Supabase CLI for local development and migrations
- **Always** test migrations on a staging environment first
