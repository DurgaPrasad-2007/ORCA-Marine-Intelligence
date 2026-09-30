# ORCA — Ocean Reasoning & Contextual Advisory

ORCA turns complex marine data into evidence-backed decisions through natural-language interaction, geospatial reasoning, and deterministic analysis.

## Run & Operate

- `pnpm install`, then copy `.env.example` to `.env` and set `GEMINI_API_KEY`
- API: `cd artifacts/api-server && node build.mjs && PORT=8080 node --env-file-if-exists=../../.env dist/index.mjs`
- Web (dev): `cd artifacts/orca-web && PORT=5173 BASE_PATH=/ API_PORT=8080 pnpm dev`
- Single process: build the web app (`vite build`), then the API serves `orca-web/dist/public`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server test` — deterministic tests; `test:live` — every adapter against the real services
- `node evaluation/agent-flows.mjs` — the real model over the brief's queries (needs a key and internet)

## Stack

- pnpm workspaces, Node 22+, TypeScript 5.9
- API: Express 5, `node:sqlite` for accounts, saved locations and conversations, custom cookie auth
- Agent: Google Gemini function calling over nine deterministic tools (`artifacts/api-server/src/orca`)
- Web: Vite, React 19, Tailwind 4, MapLibre GL, Recharts, wouter, TanStack Query

## Where things live

- `artifacts/orca-web/` — public site (`src/App.tsx`) and the signed-in app (`src/app/*`)
- `artifacts/api-server/` — auth, agent, tools, live source adapters, map and watchlist endpoints
- `evaluation/` — real-model behaviour checks and the browser walkthrough
- `README.md` — architecture, sources, limits, demo script

## Architecture decisions

- The public website and the authenticated Digha MVP share one ORCA surface; public pages explain the boundaries and the workspace stores user-owned decision runs.
- Public content is local and route-based for now so the prototype remains reliable without external data providers.
- ORCA uses explicit prototype language and distinguishes synthetic/demo examples from live or authoritative data.
- The product story centers on evidence-first decision support: AI coordinates and explains, while validated data and deterministic software decide.

## Product

The public website explains ORCA's problem, workflow, technology, data-source model, marine-science context, trust boundaries, security posture, privacy approach, terms, methodology, research agenda, and prototype status. The authenticated workspace now runs the Digha flow end to end: natural-language question → location/time context → marine evidence fixture → deterministic risk → map → auditable saved result.

## User preferences

- Keep public trust content and the authenticated workspace aligned; never let a saved fixture run look like live marine data.

## Gotchas

- Do not describe ORCA as an official ISRO product, certified system, official warning authority, guaranteed-safe tool, or legally compliant product without documentary evidence.
- Keep consequential guidance framed as decision support; official warnings and professional judgement take precedence.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
