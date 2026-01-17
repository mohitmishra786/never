---
name: Safety & Security
description: Critical security constraints that apply to all code
tags: [core, security]
globs: "**/*"
alwaysApply: true
---

# Safety & Security Constraints

## Secrets and Credentials

- Never include plain-text secrets, API keys, or tokens in code
- Never hardcode sensitive credentials; always use environment variables or secret management systems
- Never commit .env files or any file containing real credentials to version control

## Network Security

- Never disable SSL/TLS verification in network requests
- Never trust user input for constructing URLs without validation
- Never expose internal system paths or server metadata in error messages

## Code Execution

- Never use eval() or similar functions that execute arbitrary strings
- Never use dynamic code execution with unsanitized input
- Never deserialize untrusted data without validation

## Cryptography

- Never use MD5 or SHA1 for password hashing; use bcrypt, scrypt, or Argon2
- Never implement custom cryptographic algorithms; use established libraries
- Never use ECB mode for block ciphers
- Never use predictable values for cryptographic seeds or IVs

## Input Validation

- Never skip input sanitization for user-provided data
- Never trust client-side validation alone; always validate server-side
- Never interpolate user input directly into SQL queries, shell commands, or file paths
