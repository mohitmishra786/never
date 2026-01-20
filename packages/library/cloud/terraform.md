---
name: Terraform Best Practices
description: Constraints for Terraform infrastructure as code
tags: [terraform, infrastructure, iac, cloud, devops]
globs: "**/*.tf"
alwaysApply: false
---

# Terraform Constraints

## Module Structure

- **Never** write inline resources in the root module; use child modules for reusability
- **Never** create modules with more than one logical resource group; keep modules focused
- **Never** hardcode values that vary by environment; use variables with validation
- **Always** structure modules with: main.tf, variables.tf, outputs.tf, versions.tf
- **Always** document modules with README.md including usage examples

## State Management

- **Never** store state files locally for production; use remote backends (S3, GCS, Azure Blob)
- **Never** share state files between environments; use workspace isolation or separate state files
- **Never** manually edit .tfstate files; use `terraform state` commands
- **Always** enable state locking using DynamoDB (AWS) or equivalent
- **Always** encrypt state at rest and in transit

## Variables and Outputs

- **Never** use type `any` for variables; always specify explicit types
- **Never** leave variables without descriptions
- **Never** use default values for sensitive variables
- **Always** add validation blocks for variables with constraints
- **Always** mark sensitive outputs with `sensitive = true`

## Resource Naming

- **Never** use `count` when resources have unique identities; use `for_each` with maps
- **Never** reference resources by index when order matters
- **Always** use consistent naming: `resource "type" "purpose_environment_qualifier"`
- **Always** use `local` values to construct standardized resource names

## Dependencies

- **Never** use `depends_on` unless absolutely necessary; prefer implicit dependencies
- **Never** create circular dependencies between modules
- **Always** output values that other resources or modules need
- **Always** use data sources to reference existing infrastructure

## Provider Configuration

- **Never** hardcode credentials in provider blocks
- **Never** pin provider versions with `=`; use `~>` for minor version flexibility
- **Never** use multiple provider aliases without clear documentation
- **Always** specify required_providers with version constraints
- **Always** use environment variables or credential files for authentication

## Security

- **Never** commit .tfvars files containing secrets to version control
- **Never** output sensitive values without the sensitive flag
- **Never** use `ignore_changes` for security-relevant attributes
- **Always** use data sources to reference secrets from vaults
- **Always** enable versioning and access logging for state buckets

## Workspaces

- **Never** use workspaces as a replacement for environment separation in large projects
- **Always** document workspace naming conventions
- **Always** use consistent variable values per workspace

## Code Quality

- **Never** skip `terraform fmt` before committing
- **Never** ignore `terraform validate` errors
- **Always** run `terraform plan` and review before apply
- **Always** use pre-commit hooks for formatting and validation
- **Always** run security scanners like tfsec or checkov in CI
