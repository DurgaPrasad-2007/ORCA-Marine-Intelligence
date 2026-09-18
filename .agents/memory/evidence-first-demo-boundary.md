---
name: Evidence-first demo boundary
description: Rules for keeping demonstration decision workflows honest while live marine providers are unavailable.
---

Demonstration decision workflows must never make fixture values look like live marine data. Use explicit fixture, stale, unavailable, derived, and assumed states, and keep unavailable inputs visible in the result.

**Why:** The product boundary is evidence-first: users need to distinguish what was observed, derived, assumed, or unavailable before trusting a decision workflow.

**How to apply:** Preserve status and freshness labels through the API and UI, avoid silent fallback from live inputs to synthetic data, and include an inspectable evidence ledger whenever a workflow produces a finding.