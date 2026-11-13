# Agent Guidelines: Employee Salary Management

## Project Overview
Standalone Employee Onboarding and Salary Management application with React/Vite frontend and NestJS backend backed by Prisma (pinned at 7.10.1) and Neon PostgreSQL in Singapore (`aws-ap-southeast-1`).

## Ownership and Repository Constraints
- Standalone workspace: `C:/Users/admin/orca/workspaces/employee-salary-management`.
- The reference `books` project and `ASDEC-HRMS` are read-only references; never modify them or run commands inside them.
- No GitHub Issues. Tracker lives locally under `.scratch/`.
- Eventual repository is private. Do not create, push, or publish a remote or merge branches in this assignment.

## Local Issue Tracker
- Spec: `.scratch/employee-salary-app/spec.md`
- Tickets: `.scratch/employee-salary-app/issues/01-standalone-sign-in.md` through `08-baseline-verification-handoff.md`
- Planning and research: `.scratch/salary-management/`

## Working Rules
- Keep changes surgical, types explicit, and errors visible.
- Database migrations and schema updates are sequential.
- Dedicated Neon PostgreSQL isolation: separate `development` and `test` environments.
- Verify behavior against real PostgreSQL database; no mocked database assertions for auth/invariants.
