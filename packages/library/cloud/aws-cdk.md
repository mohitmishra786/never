---
name: AWS CDK Best Practices
description: Constraints for AWS Cloud Development Kit infrastructure as code
tags: [aws, cdk, infrastructure, cloud, iac]
globs: "**/*.ts"
alwaysApply: false
---

# AWS CDK Constraints

## Construct Levels

- **Never** use L1 constructs (Cfn*) when an L2 construct exists; L2 provides sensible defaults and better DX
- **Never** hardcode AWS account IDs or regions; use `Aws.ACCOUNT_ID` and `Aws.REGION` tokens
- **Never** create resources without explicit removal policies for stateful resources (databases, buckets)
- **Always** prefer L2 constructs over L1; only use L1 for features not yet in L2
- **Always** set `removalPolicy: RemovalPolicy.RETAIN` for production databases and S3 buckets

## Stack Organization

- **Never** create stacks with more than 500 resources; split into nested stacks or separate stacks
- **Never** use cross-stack references for frequently changing values; use SSM Parameter Store
- **Never** define resources in the constructor without checking for environment-specific conditions
- **Always** use separate stacks for stateful (databases) and stateless (lambdas) resources
- **Always** define clear stack dependencies using `stack.addDependency()`

## Resource Naming

- **Never** use auto-generated names for S3 buckets in production; specify explicit bucket names
- **Never** include sensitive information in resource names or tags
- **Always** use consistent naming conventions: `{app}-{env}-{resource-type}-{identifier}`
- **Always** add tags for cost allocation, environment, and ownership

## Lambda Functions

- **Never** bundle node_modules for Lambda without tree-shaking; use `NodejsFunction` with esbuild
- **Never** set Lambda memory below 128MB or timeout above 15 minutes
- **Never** use `Function` construct for Node.js; use `NodejsFunction` for automatic bundling
- **Always** configure reserved concurrency for critical functions to prevent throttling
- **Always** set appropriate timeout values based on expected execution time

## Security

- **Never** use `AnyPrincipal()` in IAM policies without explicit justification
- **Never** grant `*` permissions; follow principle of least privilege
- **Never** store secrets in environment variables; use Secrets Manager or Parameter Store
- **Always** use `Grant*` methods on resources instead of manual IAM policy creation
- **Always** enable encryption at rest for S3, RDS, DynamoDB, and SNS/SQS

## VPC and Networking

- **Never** create public subnets for databases or internal services
- **Never** use default VPC for production workloads
- **Always** use private subnets with NAT gateways for Lambda functions accessing the internet
- **Always** define security groups with minimal ingress rules

## Aspects and Compliance

- **Never** skip compliance checks; use CDK Aspects for organization-wide policies
- **Always** implement custom Aspects for tagging compliance and security scanning
- **Always** run `cdk diff` before `cdk deploy` to review changes

## Testing

- **Never** deploy without running `cdk synth` to verify template generation
- **Always** write snapshot tests for critical stacks using `Template.fromStack()`
- **Always** use assertions library to verify resource properties
