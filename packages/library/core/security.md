---
name: Security
description: Critical security constraints to prevent common vulnerabilities and data leaks
tags: [core, security, crypto, secrets]
globs: "**/*"
alwaysApply: true
---

# Security Constraints

## Cryptography & Randomness

- **Never** use `Math.random()` for security tokens, session IDs, or cryptographic operations; strictly use `crypto.getRandomValues()` or `crypto.randomBytes()`
- **Never** use MD5 or SHA1 for password hashing; use bcrypt, scrypt, or Argon2
- **Never** store passwords in plain text or with reversible encryption; always use one-way hashing with salt

## Environment & Secrets

- **Never** commit a file named `.env`, `.env.local`, `credentials.json`, or `secrets.yaml` without verifying it's in `.gitignore` first
- **Never** hardcode API keys, passwords, or tokens directly in source code; use environment variables or secret management systems
- **Never** log environment variables in production; filter them before logging

## Input Validation & XSS

- **Never** use `innerHTML`, `dangerouslySetInnerHTML`, or `v-html` with unsanitized user input; use safe text interpolation or DOMPurify
- **Never** trust user input in SQL queries; always use parameterized queries or ORMs
- **Never** use `eval()`, `Function()` constructor, or `setTimeout(string)` with user-controlled data
- **Never** construct file paths from user input without validation; sanitize and validate paths

## Network & Infrastructure

- **Never** expose database ports (5432, 6379, 27017) to `0.0.0.0` in production; bind to `127.0.0.1` or use private networks
- **Never** use `chmod 777` or `chmod -R 777` in Dockerfiles or production systems; use minimal required permissions
- **Never** disable SSL/TLS certificate validation in production (`rejectUnauthorized: false`)
- **Never** use HTTP for internal service-to-service communication; enforce HTTPS, mTLS, or VPN tunnels

## Logging & Monitoring

- **Never** log raw HTTP headers, request bodies, or response data without redacting sensitive fields (Authorization, Cookie, password fields)
- **Never** log credit card numbers, SSNs, or other PII without masking
- **Never** expose detailed error messages with stack traces to end users in production

## Dependencies & Supply Chain

- **Never** use `npm audit fix --force` without reviewing changes; manually audit breaking changes
- **Never** install packages from untrusted registries without verification
- **Never** ignore security warnings from dependency scanners

## Authentication & Authorization

- **Never** store JWT tokens or session IDs in localStorage; use httpOnly cookies
- **Never** rely solely on client-side authorization checks; always validate permissions server-side
- **Never** use predictable session IDs or tokens; use cryptographically random UUIDs

## File Operations

- **Never** execute shell commands constructed from user input without escaping
- **Never** allow file uploads without validating file type by content (magic bytes), not just extension
- **Never** serve uploaded files from the same domain as your application; use a separate CDN or subdomain
