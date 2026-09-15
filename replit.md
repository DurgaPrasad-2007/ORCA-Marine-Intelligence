# ORCA — Ocean Reasoning & Contextual Advisory

ORCA turns complex marine data into evidence-backed decisions through natural-language interaction, geospatial reasoning, and deterministic analysis.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/orca-web/` — public ORCA website and public-content routes.
- `artifacts/api-server/` — shared API service reserved for the later dashboard/MVP workflow.
- `lib/api-spec/openapi.yaml` — source of truth for future versioned API contracts.
- `attached_assets/` — source specification and project reference files.

## Architecture decisions

- The first delivery is the public website and educational/trust surface; the operational query dashboard follows as a separate MVP phase.
- Public content is local and route-based for now so the prototype remains reliable without external data providers.
- ORCA uses explicit prototype language and distinguishes synthetic/demo examples from live or authoritative data.
- The product story centers on evidence-first decision support: AI coordinates and explains, while validated data and deterministic software decide.

## Product

The public website explains ORCA's problem, workflow, technology, data-source model, marine-science context, trust boundaries, security posture, privacy approach, terms, methodology, research agenda, and prototype status. It prepares users for the later Digha demonstration flow: natural-language question → location/time context → marine evidence → deterministic risk → map → auditable result.

## User preferences

- Build the full public website, landing pages, documentation, and compliance-oriented content before implementing the operational MVP.

## Gotchas

- Do not describe ORCA as an official ISRO product, certified system, official warning authority, guaranteed-safe tool, or legally compliant product without documentary evidence.
- Keep consequential guidance framed as decision support; official warnings and professional judgement take precedence.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
