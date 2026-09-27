---
name: MVP setup quirks
description: Environment-specific setup constraints encountered while adding managed Clerk auth and Drizzle persistence.
---

Workspace package installation must target the package explicitly with pnpm filters because the generic package installer targets the monorepo root and is rejected by pnpm. Drizzle's generated identity primary keys are already excluded from `createInsertSchema`, so only omit fields that the insert schema actually exposes.

**Why:** The first dependency install and first schema push failed for these reasons, while the scoped install and corrected schema completed successfully.

**How to apply:** When adding workspace dependencies or identity-backed tables, use the package-scoped install path and inspect the generated insert schema before calling `.omit()`.