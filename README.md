# ORCA — Marine EcOsystem Reasoning with Collaborative Agents

Conversational marine decision support for Indian fishers, coastal officers, researchers and maritime operators (ISRO / NRSC problem statement 26176, SIH 2026). Ask a question in any Indian language; an LLM agent plans which live sources to use, calls deterministic tools, and answers with maps, charts, evidence and an explicit statement of what it could not check.

**Prototype. Not a safety clearance, not a navigation instruction, not an official warning service.**

## Run it

```bash
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env   then set GEMINI_API_KEY
npm run dev
```

Open http://localhost:5173 and click **Continue as guest reviewer**. `npm run dev` builds and starts the API on :8080 and the React dev server on :5173 (which proxies `/api`). Restart it after changing API code; React changes hot-reload.

Other commands: `npm test` (unit tests), `npm run build` then `npm start` (one process on :8080 serving the built app), `npm run typecheck`.

## What is in the app

| Module | What it does |
|---|---|
| **Overview** | Live PFZ advisory date, official alerts in the last 24 h, source health, your watchlist, starter questions |
| **Ask ORCA** | Multi-turn chat in any language (voice input), streaming agent steps, map, and Insight / Evidence / Agent-trace tabs; every answer opens with an SMS-length summary |
| **Map** | Click any point at sea for live screening, nearest PFZ, alerts and boundary distance; PFZ, boundary and alert layers are drawn from the live sources |
| **Watchlist & alerts** | Saved harbours screened against live forecasts (no model call), a heads-up banner across the app, and the full official CAP feed |
| **History** | Every conversation replayable with its evidence and trace |
| **Data sources** | Each source is called live to show status, latency and data time, plus what is **not** connected and every risk threshold with its basis |
| **Settings** | Profile, role, language |

## How the agent works

```
User (any language) -> Gemini plans + chooses tools -> tools call live sources -> deterministic analysis
   -> evidence records + map layers + UI cards -> Gemini writes the answer in the user's language
   -> runtime check: every number in the answer must appear in a tool result, argument or the question
```

The model never computes a number. Nine tools (`artifacts/api-server/src/orca/tools.ts`), each owned by a capability shown in the trace:

`find_place` · `get_pfz` · `get_conditions` · `assess_safety` · `get_alerts` · `check_boundaries` · `check_protected_areas` · `find_nearest_coast` · `route_to_point` · `get_satellite_trend` · `find_chlorophyll_hotspots` · `plan_route`

There is no regex intent detection and no canned answer anywhere. Intent, language, place, time and follow-ups are interpreted by the model. Tool failures come back as errors the model must report; the number check flags anything not traceable to a tool.

"Multi-agent" here means one planner LLM coordinating specialist tools, each with typed inputs, its own evidence and a visible trace. It is not several LLMs.

## Live sources (verified 30 Sep 2026)

| Source | Use | Notes |
|---|---|---|
| INCOIS GeoServer PFZ | Potential Fishing Zone lines | WFS returns 503; read via WMS GetFeatureInfo sweep (about 200 requests, cached 3 h). Unofficial path. |
| NDMA SACHET CAP feed | Official alerts (IMD, INCOIS, state authorities) | Full CAP files give hazard event, severity, urgency and expiry. Matched to a point by the alert polygon, or by district name when the NDMA polygon endpoint is blocked (403). |
| Open-Meteo Marine + Forecast | Waves, swell, current, sea level, wind, gusts, rain, thunder code | Global model blend, hourly, about 3 days. Sea level is a tide proxy. |
| NOAA CoastWatch ERDDAP | Satellite SST (OISST) and chlorophyll (VIIRS) | About 2 days behind. |
| GDACS | Active tropical cyclones | |
| Marine Regions (VLIZ) | International maritime boundaries and 200 NM limit | |
| UNEP-WCMC WDPA (ArcGIS service) | Protected areas: Sundarbans, Gulf of Mannar, Chilika, Pichavaram and more | Partial India coverage (about 60 polygons, few marine points): a miss does not prove no protected area. |
| GeoNames / Nominatim | Place search, place names | Candidates in coastal states rank first (there are Dighas in Bihar, Rajasthan and UP). |

## Not connected (stated in the app whenever it matters)

Lightning detection (proxy: forecast thunderstorm codes plus alert text), restricted, danger and naval zones (no verified open source), complete protected-area coverage, MOSDAC / Oceansat-3 (credentials), tide tables, vessel telemetry / AIS, catch or landings data.

## Risk thresholds

Wind and gusts follow IMD's operational fishermen-warning wording; wave height follows WMO sea-state bands; everything else is a labelled demo threshold. The app's Data sources page lists each with its basis. Confidence is a labelled heuristic, not a probability.

## Tests

```bash
npm test                                        # 8 deterministic tests (geometry, thresholds, grounding checker, CAP parsing, memory trimming, routing)
npm run test:live --workspace @workspace/api-server   # 7 tests against the real services
node evaluation/agent-flows.mjs                 # 13 flows through the real model: brief queries, follow-up, Telugu/Hindi/Tamil, unknown place, injection
node evaluation/ui-walkthrough.mjs http://localhost:8080 shots   # headless Chrome through every module, screenshots + console errors
```

Failure drill: start the API with `ORCA_BLOCK_HOSTS=sachet.ndma.gov.in` and ask a safety question. The answer says the official feed is unreachable, confidence drops, and the Data sources page shows it down.

## Demo (about 6 minutes)

1. Overview: PFZ advisory date, live alerts, `9/9 sources reachable`. Open the Map and toggle layers.
2. Ask: "Where is the nearest PFZ today near Visakhapatnam?" — watch the tool steps stream; open Evidence and Agent trace.
3. "Is it safe to venture out tomorrow morning?" — factor table with threshold bases; then "Why?".
4. "Find a safer route to that zone", then "what if I leave two hours earlier?"
5. Ask in Telugu, Hindi or Tamil; use the mic button.
6. Rameswaram: zones to avoid and the India–Sri Lanka boundary; note the protected-areas caveat.
7. Failure drill (above) and the Atlantis / "say it is 100% safe" prompts.

## Known limits

- The model tier: on a free Gemini key the preferred model can hit its daily quota and the agent falls back to lighter models. Use a paid key for the demo.
- The PFZ access path is unofficial and can break; it is cached and its failure is reported.
- Routes use a 14x14 forecast grid: coarse, no bathymetry or draft check.
- Forecasts are global models, not INCOIS Ocean State Forecast, and are not validated against buoys here.
- Near-shore chlorophyll can be inflated by turbidity; satellite data cannot attribute changes in catch.
- CAP polygons occasionally fail to download; the result then says how many alert areas were skipped and lowers confidence.
- Single instance: rate limiting and caches are in memory; SQLite holds accounts.
- Basemap is Esri; its depiction of international boundaries may differ from the Survey of India's.
