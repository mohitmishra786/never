---
name: Docker & Containers
description: Best practices for secure and efficient containerization
tags: [devops, docker, containers, security]
globs: ["**/Dockerfile", "**/docker-compose.yml", "**/*.dockerfile"]
alwaysApply: false
---

# Docker & Container Constraints

## Security

- **Never** use `chmod 777` in Dockerfiles; use minimum required permissions (e.g., `chmod 644` for files, `chmod 755` for executables)
- **Never** run containers as root user; use `USER` directive to run as non-privileged user
- **Never** use `:latest` tag in production `FROM` statements; pin to specific versions (e.g., `node:20.11.0-alpine`)
- **Never** store secrets in Dockerfile `ENV` or `ARG` directives; use Docker secrets or runtime environment variables
- **Never** expose unnecessary ports to `0.0.0.0` in docker-compose; bind to `127.0.0.1` or use internal networks

## Build Optimization

- **Never** install development dependencies in production images; use multi-stage builds and `--production` flag
- **Never** copy entire project directory with `COPY . .` without a `.dockerignore`
- **Never** use `apt-get upgrade` or `apk upgrade` without pinning package versions
- **Never** run `apt-get update` and `apt-get install` in separate `RUN` commands; combine them

## Networking

- **Never** use `host` network mode in production unless absolutely necessary
- **Never** hardcode IP addresses or hostnames in containers; use Docker DNS service names or environment variables

## Resource Management

- **Never** run containers without resource limits; set `mem_limit`, `cpus`, or use Docker resource constraints
- **Never** use unlimited restart policies without rate limiting; use `on-failure:5` or similar

## Logging & Debugging

- **Never** log sensitive data to stdout/stderr in containers; filter before logging
- **Never** use `docker exec` to modify running container state in production; containers should be immutable

## Health & Monitoring

- **Never** deploy containers without health checks; define `HEALTHCHECK` in Dockerfile
- **Never** ignore container exit codes; monitor and alert on non-zero exits
