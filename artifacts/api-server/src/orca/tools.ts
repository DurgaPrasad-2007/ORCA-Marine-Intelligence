// The agent's tool surface. Every tool wraps deterministic code (geometry, thresholds, routing, statistics) over live sources,
// returns compact JSON for the model, and also emits UI blocks, map layers and evidence for the app.
// The model plans and explains; it never computes numbers.
import { z } from "zod/v4";
import { bearingDeg, compass, haversineKm, nearestBoundaries, nearestOnLine, type LonLat } from "./geo";
import { assess, bestWindow, confidence, hourlyLevels, windowIdx, type Window } from "./risk";
import { astar, buildGrid, eta } from "./route";
import { alertsNear, boundaries, capAlerts, cyclonesNear, eoGrid, eoPointSeries, geocode, marineForecast, nearestCoast, pfzFeatures, protectedAreas, protectedNear, reverseName, weatherForecast, type Evidence, type Hourly } from "./sources";

export type TraceStep = { agent: string; tool: string; args: unknown; status: "running" | "ok" | "failed"; ms?: number; detail?: string; output?: string };
export type Block = { type: string; title: string; [k: string]: unknown };
export type Run = {
  emit: (step: TraceStep) => void;
  trace: TraceStep[];
  blocks: Block[];
  layers: Record<string, unknown>;
  evidence: Map<string, Evidence>;
  saved?: Array<{ name: string; lat: number; lon: number }>;
};
export const newRun = (emit: Run["emit"] = () => undefined): Run => ({ emit, trace: [], blocks: [], layers: {}, evidence: new Map() });

const lat = z.number().min(0).max(40).describe("Latitude, decimal degrees north");
const lon = z.number().min(55).max(100).describe("Longitude, decimal degrees east");
const iso = z.string().datetime({ offset: true }).describe("ISO 8601 timestamp with offset, e.g. 2026-09-30T04:00:00+05:30");

const r1 = (n: number) => Math.round(n * 10) / 10;
const fc = (features: unknown[]) => ({ type: "FeatureCollection", features });
const pt = (p: LonLat, props: Record<string, unknown> = {}) => ({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: p } });
const ln = (c: LonLat[] | LonLat[][], props: Record<string, unknown> = {}) => ({ type: "Feature", properties: props, geometry: Array.isArray(c[0]?.[0]) ? { type: "MultiLineString", coordinates: c } : { type: "LineString", coordinates: c } });
const LABEL = { SAFE: "Lower risk", CAUTION: "Caution", "HIGH RISK": "High risk", "INSUFFICIENT DATA": "Insufficient data" } as const;
export const window = (start: string, end: string): Window => ({ start: new Date(start), end: new Date(end), label: `${start} → ${end}` });
/** ISO timestamp in IST (+05:30), the zone users think in, so window labels are never UTC by accident. */
export const istIso = (ms: number) => `${new Date(ms + 5.5 * 3.6e6).toISOString().slice(0, 19)}+05:30`;
const defaultWindow = () => window(new Date().toISOString(), new Date(Date.now() + 12 * 3.6e6).toISOString());

const arr = (s: Hourly | undefined, k: string) => (s?.[k] as Array<number | null> | undefined) ?? [];
const inWin = (s: Hourly | undefined, k: string, idx: number[]) => idx.map((i) => arr(s, k)[i]).filter((v): v is number => typeof v === "number");
const max = (a: number[]) => (a.length ? r1(Math.max(...a)) : null);
const min = (a: number[]) => (a.length ? r1(Math.min(...a)) : null);
const mean = (a: number[]) => (a.length ? r1(a.reduce((x, y) => x + y, 0) / a.length) : null);

export async function forecastAt(r: Run, p: LonLat) {
  const [m, w] = await Promise.all([marineForecast([p]), weatherForecast([p])]);
  r.evidence.set(m.evidence.id, m.evidence);
  r.evidence.set(w.evidence.id, w.evidence);
  return { marine: m.series[0] as Hourly | undefined, weather: w.series[0] as Hourly | undefined };
}

async function alertsAt(r: Run, p: LonLat, nearKm = 25) {
  const cap = await capAlerts();
  r.evidence.set(cap.evidence.id, cap.evidence);
  return alertsNear(cap.items, p, nearKm);
}

/** Full safety assessment for a point and window. Also used, without the model, by the watchlist and map endpoints. */
export async function safetyAt(r: Run, p: LonLat, w: Window) {
  const [fcs, alerts, cyc, bnd, wdpa] = await Promise.allSettled([forecastAt(r, p), alertsAt(r, p), cyclonesNear(p), boundaries(), protectedAreas()]);
  const f = fcs.status === "fulfilled" ? fcs.value : { marine: undefined, weather: undefined };
  const near = bnd.status === "fulfilled" ? nearestBoundaries(p, bnd.value.lines, 60)[0] : undefined;
  if (bnd.status === "fulfilled") r.evidence.set(bnd.value.evidence.id, bnd.value.evidence);
  if (cyc.status === "fulfilled") r.evidence.set(cyc.value.evidence.id, cyc.value.evidence);
  const prot = wdpa.status === "fulfilled" ? protectedNear(p, wdpa.value.areas, 60)[0] : undefined;
  if (wdpa.status === "fulfilled") r.evidence.set(wdpa.value.evidence.id, wdpa.value.evidence);
  const risk = assess(f.marine, f.weather, w, {
    cycloneKm: cyc.status === "fulfilled" ? (cyc.value.events[0]?.km ?? null) : undefined,
    officialAlerts: alerts.status === "fulfilled" ? alerts.value.matches : undefined,
    geofence: near ? { name: near.name, inside: false, km: near.km } : null,
    protectedArea: prot ? { name: prot.name, inside: prot.inside, km: prot.km } : null,
  });
  const hourly = hourlyLevels(f.marine, f.weather, w);
  const missing = [
    ...(fcs.status === "rejected" ? ["forecast models"] : []),
    ...(alerts.status === "rejected" ? ["official CAP alerts"] : alerts.value.unresolved ? [`${alerts.value.unresolved} of ${alerts.value.considered} alert areas could not be fetched`] : []),
    ...(cyc.status === "rejected" ? ["cyclone feed"] : []),
    ...(wdpa.status === "rejected" ? ["protected-area boundaries"] : []),
    ...risk.factors.filter((x) => x.level === "unknown" && ["wave", "wind", "gust"].includes(x.key)).map((x) => x.label),
  ];
  const stale = [...r.evidence.values()].filter((e) => e.status === "stale").map((e) => e.product);
  const conf = confidence({ missing, stale, horizonH: (w.end.getTime() - Date.now()) / 3.6e6, conflicts: [] });
  return { risk, hourly, best: bestWindow(hourly), conf, alerts: alerts.status === "fulfilled" ? alerts.value : null, cyclones: cyc.status === "fulfilled" ? cyc.value.events : null, nearBoundary: near ?? null, nearProtected: prot ? { name: prot.name, km: prot.km, inside: prot.inside } : null, missing };
}

export type ToolDef = { name: string; agent: string; description: string; schema: z.ZodType; run: (input: never) => Promise<unknown> };

export function makeTools(r: Run): ToolDef[] {
  const setLocation = (p: LonLat, name?: string) => (r.layers["location"] = fc([pt(p, { name: name ?? "Location" })]));
  const def = <S extends z.ZodType>(name: string, agent: string, description: string, schema: S, fn: (i: z.infer<S>) => Promise<unknown>): ToolDef => ({
    name, agent, description, schema,
    run: fn as ToolDef["run"],
  });

  const list: ToolDef[] = [
    def("find_place", "Geospatial", "Geocode a place in India to coordinates (live GeoNames search). Pass the name in Latin script (transliterate if the user wrote it in another script). Place names repeat across India, so each candidate says whether its state has a coast (coastal_state). Prefer coastal candidates for sea questions; if two or more coastal candidates are plausible, ask the user which one instead of guessing.", z.object({ name: z.string().min(2).max(80) }), async ({ name }) => {
      const g = await geocode(name);
      r.evidence.set(g.evidence.id, g.evidence);
      const coastal = g.matches.filter((m) => m.coastal);
      if (coastal.length === 1) setLocation(coastal[0]!.lonlat, coastal[0]!.name);
      return g.matches.length ? { matches: g.matches.map((m) => ({ name: m.name, admin: m.admin, coastal_state: m.coastal, lat: m.lonlat[1], lon: m.lonlat[0] })) } : { matches: [], note: `No place named "${name}" found in India.` };
    }),

    def("get_pfz", "Marine Data", "Potential Fishing Zones from the current INCOIS advisory (derived by ISRO/INCOIS from satellite SST and chlorophyll). Returns the nearest zones with distance and bearing, the issue date, and whether each lies close to an international boundary. Optionally ranks zones by forecast risk for a time window.", z.object({
      lat, lon,
      radius_km: z.number().min(10).max(600).default(150),
      assess_risk: z.boolean().default(false).describe("Also compute forecast risk at each zone for the window"),
      start: iso.optional(), end: iso.optional(),
    }), async ({ lat, lon, radius_km, assess_risk, start, end }) => {
      const here: LonLat = [lon, lat];
      setLocation(here);
      const [{ features, evidence }, bnd] = await Promise.all([pfzFeatures(), boundaries().catch(() => null)]);
      r.evidence.set(evidence.id, evidence);
      if (bnd) r.evidence.set(bnd.evidence.id, bnd.evidence);
      let zones = features
        .map((f) => {
          const best = f.coordinates.map((l) => nearestOnLine(here, l)).sort((a, b) => a.km - b.km)[0]!;
          return { id: f.id, sector: f.sector, issued: f.issued, km: r1(best.km), dir: compass(bearingDeg(here, best.point)), nearest: best.point, coordinates: f.coordinates };
        })
        .filter((z) => z.km <= radius_km)
        .sort((a, b) => a.km - b.km)
        .slice(0, 8)
        .map((z) => ({ ...z, boundaryWithin15km: bnd ? (nearestBoundaries(z.nearest, bnd.lines, 15)[0]?.name ?? null) : null }));
      let risks: Array<{ risk: string; reasons: string[] } | undefined> = zones.map(() => undefined);
      if (assess_risk && zones.length) {
        const w = start && end ? window(start, end) : defaultWindow();
        const [m, wx] = await Promise.all([marineForecast(zones.map((z) => z.nearest)), weatherForecast(zones.map((z) => z.nearest))]);
        r.evidence.set(m.evidence.id, m.evidence);
        r.evidence.set(wx.evidence.id, wx.evidence);
        risks = zones.map((z, i) => {
          const a = assess(m.series[i], wx.series[i], w, { geofence: z.boundaryWithin15km ? { name: z.boundaryWithin15km, inside: false, km: 15 } : null });
          return { risk: a.overall, reasons: a.factors.filter((f) => f.level === "caution" || f.level === "avoid").map((f) => `${f.label}: ${f.value}`) };
        });
        const order = { SAFE: 0, CAUTION: 1, "HIGH RISK": 2, "INSUFFICIENT DATA": 3 } as Record<string, number>;
        const idx = zones.map((_, i) => i).sort((a, b) => order[risks[a]!.risk]! - order[risks[b]!.risk]! || zones[a]!.km - zones[b]!.km);
        zones = idx.map((i) => zones[i]!);
        risks = idx.map((i) => risks[i]);
      }
      r.layers["pfz"] = fc(zones.map((z, i) => ln(z.coordinates, { id: z.id, km: z.km, rank: i + 1, risk: risks[i]?.risk ?? null })));
      const pts: LonLat[] = [here, ...zones.map((z) => z.nearest)];
      r.layers["fit"] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
      const out = zones.map((z, i) => ({ id: z.id, sector: z.sector, issued: z.issued, distance_km: z.km, direction: z.dir, nearest_lat: r1(z.nearest[1]), nearest_lon: r1(z.nearest[0]), near_international_boundary: z.boundaryWithin15km, forecast_risk: risks[i]?.risk ?? undefined, risk_reasons: risks[i]?.reasons }));
      r.blocks.push({ type: "pfz", title: zones.length ? `${zones.length} nearest PFZ (advisory ${evidence.observedAt ?? "date unknown"})` : "No PFZ in range", issued: evidence.observedAt, advisoryStatus: evidence.status, zones: out });
      return zones.length ? { advisory_issued: evidence.observedAt, advisory_status: evidence.status, zones: out } : { advisory_issued: evidence.observedAt, zones: [], note: `No PFZ line within ${radius_km} km in the current advisory.` };
    }),

    def("get_conditions", "Ocean & Weather", "Hourly sea and weather forecast at a point for a time window: wave height and period, swell, current, model SST, wind, gusts, rain probability, thunderstorm hours, and model sea-level (tide proxy, not a tide table). Also draws the hourly chart.", z.object({ lat, lon, start: iso, end: iso }), async ({ lat, lon, start, end }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const w = window(start, end);
      const { marine, weather } = await forecastAt(r, p);
      const mi = marine ? windowIdx(marine.time, w) : [];
      const wi = weather ? windowIdx(weather.time, w) : [];
      if (!mi.length && !wi.length) throw new Error("Forecast has no hours inside this window (the forecast covers roughly the next 3 days).");
      const sea = mi.map((i) => ({ i, v: arr(marine, "sea_level_height_msl")[i] })).filter((x): x is { i: number; v: number } => typeof x.v === "number");
      const hi = sea.length ? sea.reduce((a, b) => (b.v > a.v ? b : a)) : null;
      const lo = sea.length ? sea.reduce((a, b) => (b.v < a.v ? b : a)) : null;
      const chart = mi.map((i, k) => ({ time: `${marine!.time[i]}+05:30`, wave_m: arr(marine, "wave_height")[i], wind_kmh: wi[k] !== undefined ? arr(weather, "wind_speed_10m")[wi[k]!] : null, gust_kmh: wi[k] !== undefined ? arr(weather, "wind_gusts_10m")[wi[k]!] : null }));
      r.blocks.push({ type: "chart", title: "Wave, wind and gust forecast", series: chart, keys: [{ k: "wave_m", label: "Wave height (m)" }, { k: "wind_kmh", label: "Wind (km/h)" }, { k: "gust_kmh", label: "Gust (km/h)" }] });
      return {
        window: w.label,
        wave_height_m: { max: max(inWin(marine, "wave_height", mi)), mean: mean(inWin(marine, "wave_height", mi)) },
        wave_period_s: mean(inWin(marine, "wave_period", mi)),
        swell_height_m_max: max(inWin(marine, "swell_wave_height", mi)),
        current_kmh_max: max(inWin(marine, "ocean_current_velocity", mi)),
        sea_surface_temp_c_model: mean(inWin(marine, "sea_surface_temperature", mi)),
        wind_kmh_max: max(inWin(weather, "wind_speed_10m", wi)),
        gust_kmh_max: max(inWin(weather, "wind_gusts_10m", wi)),
        rain_probability_pct_max: max(inWin(weather, "precipitation_probability", wi)),
        thunderstorm_forecast_hours: inWin(weather, "weather_code", wi).filter((c) => c >= 95).length,
        model_sea_level_m: hi && lo ? { high: { value: r1(hi.v), time: `${marine!.time[hi.i]}+05:30` }, low: { value: r1(lo.v), time: `${marine!.time[lo.i]}+05:30` } } : null,
        note: "Model forecast, not an observation. Sea level is a tide proxy.",
      };
    }),

    def("assess_safety", "Risk", "Deterministic safety screening for a point and time window: wave, wind, gust, thunderstorm proxy, rain, visibility, cyclone proximity, nearby official CAP alerts, and distance to an international boundary. Returns each factor with its value, threshold and basis, the overall level, the best contiguous departure window, and a confidence with reasons. Use it for any 'is it safe' question, and call it more than once to compare windows.", z.object({ lat, lon, start: iso, end: iso }), async ({ lat, lon, start, end }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const s = await safetyAt(r, p, window(start, end));
      const verdict = LABEL[s.risk.overall];
      r.blocks.push({ type: "risk", title: `${verdict} · ${start.slice(0, 16).replace("T", " ")} → ${end.slice(11, 16)}`, level: s.risk.overall, verdict, factors: s.risk.factors, hourly: s.hourly, best: s.best, confidence: s.conf, missing: s.missing, alerts: s.alerts?.matches.map(({ rings: _r, ...a }) => a) ?? [] });
      if (s.alerts?.matches.length) r.layers["alerts"] = fc(s.alerts.matches.flatMap((a) => (a.rings ?? []).map((ring) => ({ type: "Feature", properties: { title: a.title }, geometry: { type: "Polygon", coordinates: [ring] } }))));
      return {
        overall: s.risk.overall, window: s.risk.window.label,
        factors: s.risk.factors.map((f) => ({ factor: f.label, value: f.value, level: f.level, threshold: f.threshold, basis: f.basis })),
        best_departure_window: s.best, confidence: s.conf, missing_inputs: s.missing,
        official_alerts_nearby: s.alerts?.matches.map((a) => ({ title: a.title, hazard_event: a.event, severity: a.severity, urgency: a.urgency, expires: a.expires, issuer: a.sender, published: a.published, matched_by: a.matchedBy, distance_km: a.distKm })) ?? null,
        cyclones: s.cyclones?.slice(0, 3) ?? null,
        nearest_international_boundary: s.nearBoundary ? { name: s.nearBoundary.name, km: s.nearBoundary.km, direction: s.nearBoundary.dir } : null,
        nearest_protected_area: s.nearProtected,
      };
    }),

    def("get_alerts", "Weather", "Official alerts from the NDMA SACHET CAP feed (IMD, INCOIS, state disaster authorities) whose published area contains or lies near a point, plus active tropical cyclones from GDACS. Each alert has its CAP hazard_event, severity, urgency and expiry; read them with the text.", z.object({ lat, lon, radius_km: z.number().min(0).max(200).default(25), max_age_hours: z.number().min(1).max(72).default(36) }), async ({ lat, lon, radius_km }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const [a, c] = await Promise.allSettled([alertsAt(r, p, radius_km), cyclonesNear(p)]);
      if (c.status === "fulfilled") r.evidence.set(c.value.evidence.id, c.value.evidence);
      const matches = a.status === "fulfilled" ? a.value.matches : [];
      const events = c.status === "fulfilled" ? c.value.events : [];
      if (matches.length) r.layers["alerts"] = fc(matches.flatMap((x) => (x.rings ?? []).map((ring) => ({ type: "Feature", properties: { title: x.title }, geometry: { type: "Polygon", coordinates: [ring] } }))));
      r.blocks.push({ type: "alerts", title: matches.length ? `${matches.length} official alert${matches.length === 1 ? "" : "s"} within ${radius_km} km` : `No official alerts within ${radius_km} km`, alerts: matches.map(({ rings: _r, ...x }) => x), cyclones: events.slice(0, 3), incomplete: a.status === "rejected" ? "CAP feed unavailable" : a.value.unresolved ? `${a.value.unresolved} alert areas could not be fetched` : null });
      if (a.status === "rejected") throw new Error(`Official CAP alert feed unavailable: ${a.reason instanceof Error ? a.reason.message : a.reason}`);
      return {
        alerts: matches.map((x) => ({ title: x.title, hazard_event: x.event, severity: x.severity, urgency: x.urgency, expires: x.expires, issuer: x.sender, published: x.published, matched_by: x.matchedBy, distance_km: x.distKm })),
        alerts_checked: a.value.considered, alert_areas_unresolved: a.value.unresolved,
        active_cyclones: c.status === "fulfilled" ? events.slice(0, 3).map((e) => ({ name: e.name, alert_level: e.alertLevel, distance_km: e.km })) : "cyclone feed unavailable",
        note: "No lightning-detection feed is connected; thunderstorm risk comes from forecast weather codes and alert text.",
      };
    }),

    def("check_boundaries", "Geospatial", "Distance and direction from a point to the nearest international maritime boundaries of India (treaty and median lines, 200 NM limit) from Marine Regions. Protected areas are checked separately with check_protected_areas; restricted, danger and naval zones are not covered.", z.object({ lat, lon, within_km: z.number().min(5).max(500).default(100) }), async ({ lat, lon, within_km }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const b = await boundaries();
      r.evidence.set(b.evidence.id, b.evidence);
      const near = nearestBoundaries(p, b.lines, within_km);
      r.layers["geofence"] = fc(near.map((n) => ln([p, n.nearest], { name: n.name, km: n.km })));
      r.blocks.push({ type: "geofence", title: near.length ? `${near[0]!.km} km from ${near[0]!.name}` : `No boundary within ${within_km} km`, boundaries: near.map(({ nearest: _n, ...x }) => x) });
      return { boundaries: near.map((n) => ({ name: n.name, type: n.type, agreement: n.agreement, distance_km: n.km, direction: n.dir })), not_covered: "Restricted, danger and naval zones (no verified public source). Use check_protected_areas for protected areas." };
    }),

    def("check_protected_areas", "Geospatial", "Protected areas (national parks, biosphere reserves, Ramsar wetlands, sanctuaries) near a point from the UNEP-WCMC World Database on Protected Areas. Reports whether the point is inside one and the distance to each. Coverage of India in this public service is partial, so an empty result does NOT prove there is no protected or restricted area; say so. Restricted, danger and naval zones are not covered.", z.object({ lat, lon, within_km: z.number().min(5).max(500).default(80) }), async ({ lat, lon, within_km }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const w = await protectedAreas();
      r.evidence.set(w.evidence.id, w.evidence);
      const near = protectedNear(p, w.areas, within_km).slice(0, 6);
      r.layers["protected"] = fc(near.flatMap((a): unknown[] => (a.point ? [pt(a.point, { name: a.name })] : a.polygons.map((poly) => ({ type: "Feature", properties: { name: a.name }, geometry: { type: "Polygon", coordinates: poly } })))));
      r.blocks.push({ type: "protected", title: near.length ? (near[0]!.inside ? `Inside ${near[0]!.name}` : `${near[0]!.km} km from ${near[0]!.name}`) : `No protected area in the database within ${within_km} km`, areas: near.map(({ polygons: _p, point: _pt, ...a }) => a), coverage: "partial" });
      return { protected_areas: near.map((a) => ({ name: a.name, designation: a.designation, realm: a.realm, iucn_category: a.iucn, inside: a.inside, distance_km: a.km, boundary_published: a.boundaryPublished })), coverage_warning: "This database has partial coverage of India. No result does not mean there is no protected or restricted area.", not_covered: "Restricted, danger and naval zones." };
    }),

    def("get_satellite_trend", "Satellite EO", "Recent satellite time series (NOAA OISST sea-surface temperature or VIIRS chlorophyll-a) at the nearest valid sea cell, with the latest value, its anomaly against the window mean, and optionally the same days a year earlier. Satellite products lag about 2 days. Use for 'why has productivity changed' questions; it cannot attribute causes.", z.object({ lat, lon, variable: z.enum(["sst", "chlorophyll"]), days: z.number().int().min(3).max(60).default(14), compare_year_ago: z.boolean().default(false) }), async ({ lat, lon, variable, days, compare_year_ago }) => {
      const p: LonLat = [lon, lat];
      setLocation(p);
      const v = variable === "sst" ? "sst" : "chl";
      const cur = await eoPointSeries(v, p, `last-${days}:last`);
      r.evidence.set(cur.evidence.id, cur.evidence);
      const vals = cur.rows.map((x) => x.value);
      if (!vals.length) throw new Error(`No valid ${variable} sea cell within ±0.3° of this point (land mask or cloud gaps).`);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const latest = cur.rows.at(-1)!;
      let prior: Array<{ time: string; value: number }> = [];
      if (compare_year_ago) {
        const end = new Date(Date.parse(latest.time));
        end.setUTCFullYear(end.getUTCFullYear() - 1);
        const start = new Date(end.getTime() - (days - 1) * 864e5);
        try {
          const py = await eoPointSeries(v, p, `(${start.toISOString().slice(0, 10)}):(${end.toISOString().slice(0, 10)})`);
          prior = py.rows;
          r.evidence.set(`${py.evidence.id}-PY`, { ...py.evidence, id: `${py.evidence.id}-PY`, status: "historical", note: "Same days one year earlier." });
        } catch { /* reported below */ }
      }
      const pavg = prior.length ? prior.reduce((a, b) => a + b.value, 0) / prior.length : null;
      const unit = variable === "sst" ? "°C" : "mg/m³";
      r.blocks.push({ type: "chart", title: `${variable === "sst" ? "Sea-surface temperature" : "Chlorophyll-a"} · last ${days} days${prior.length ? " vs a year earlier" : ""}`, series: cur.rows.map((x, i) => ({ time: x.time, [variable]: x.value, year_ago: prior[i]?.value ?? null })), keys: [{ k: variable, label: `${variable} (${unit})` }, ...(prior.length ? [{ k: "year_ago", label: `A year earlier (${unit})` }] : [])] });
      return {
        variable, unit, latest: { date: latest.time, value: latest.value }, window_mean: r1(avg * 100) / 100, anomaly_vs_window_mean: Math.round((latest.value - avg) * 100) / 100,
        first_day_value: cur.rows[0]!.value, days_with_data: vals.length,
        year_ago_mean: pavg === null ? (compare_year_ago ? "unavailable" : undefined) : Math.round(pavg * 100) / 100,
        change_vs_year_ago_mean: pavg === null ? undefined : Math.round((avg - pavg) * 100) / 100, // computed here so the model never subtracts
        note: cur.evidence.note, caveat: "Near-shore chlorophyll can be inflated by turbidity; satellite data cannot attribute changes in catch.",
      };
    }),

    def("find_chlorophyll_hotspots", "Satellite EO", "Find cells with high chlorophyll-a and sea-surface temperature inside a range, in a box around a point or over an explicit bounding box (use a bounding box for a whole-coast scan). You choose the thresholds; typical productive coastal water is above 0.5 mg/m³ chlorophyll and 26–30 °C SST, but state the thresholds you used.", z.object({
      lat: lat.optional(), lon: lon.optional(), radius_km: z.number().min(20).max(500).default(150),
      bbox: z.array(z.number()).length(4).optional().describe("[west, south, east, north] in degrees, lon 55-100 and lat 0-40; overrides the point"),
      min_chlorophyll: z.number().min(0).max(50).default(0.5), min_sst: z.number().min(0).max(40).optional(), max_sst: z.number().min(0).max(40).optional(),
      limit: z.number().int().min(1).max(15).default(8),
    }), async ({ lat, lon, radius_km, bbox, min_chlorophyll, min_sst, max_sst, limit }) => {
      let box: [number, number, number, number];
      if (bbox) {
        if (bbox[0]! < 55 || bbox[2]! > 100 || bbox[1]! < 0 || bbox[3]! > 40 || bbox[0]! >= bbox[2]! || bbox[1]! >= bbox[3]!) throw new Error("bbox must be [west, south, east, north] inside lon 55-100, lat 0-40.");
        box = bbox as [number, number, number, number];
      }
      else if (lat !== undefined && lon !== undefined) { const dLat = radius_km / 111; const dLon = radius_km / (111 * Math.cos((lat * Math.PI) / 180)); box = [lon - dLon, lat - dLat, lon + dLon, lat + dLat]; setLocation([lon, lat]); }
      else throw new Error("Provide lat and lon, or a bbox.");
      const span = Math.max(box[2] - box[0], box[3] - box[1]);
      if (span > 25) throw new Error("Bounding box too large (max 25° per side). Scan one coast at a time.");
      const chlStride = Math.max(1, Math.ceil(span / 0.083 / 60));
      const sstStride = Math.max(1, Math.ceil(span / 0.25 / 40));
      const [chl, sst] = await Promise.all([eoGrid("chl", box, chlStride), eoGrid("sst", box, sstStride).catch(() => null)]);
      r.evidence.set(chl.evidence.id, chl.evidence);
      if (sst) r.evidence.set(sst.evidence.id, sst.evidence);
      const key = (v: number) => Math.round((v - 0.125) / 0.25);
      const sstAt = new Map((sst?.cells ?? []).map((c) => [`${key(c.lonlat[0])},${key(c.lonlat[1])}`, c.value]));
      const centre: LonLat = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
      const hits = chl.cells
        .map((c) => ({ ...c, sst: sstAt.get(`${key(c.lonlat[0])},${key(c.lonlat[1])}`) ?? null }))
        .filter((c) => c.value >= min_chlorophyll && (min_sst === undefined || (c.sst !== null && c.sst >= min_sst)) && (max_sst === undefined || (c.sst !== null && c.sst <= max_sst)))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
      const named = await Promise.all(hits.map(async (h) => ({ ...h, place: await reverseName(h.lonlat) })));
      r.layers["hotspots"] = fc(named.map((h, i) => pt(h.lonlat, { rank: i + 1, chl: h.value, sst: h.sst })));
      r.layers["fit"] = box;
      r.blocks.push({ type: "hotspots", title: `${named.length} chlorophyll hotspot${named.length === 1 ? "" : "s"}`, observed: chl.evidence.observedAt, thresholds: { min_chlorophyll, min_sst, max_sst }, cells: named.map((h) => ({ lat: r1(h.lonlat[1]), lon: r1(h.lonlat[0]), chlorophyll: h.value, sst: h.sst, place: h.place })) });
      return { satellite_date: chl.evidence.observedAt, thresholds_used: { min_chlorophyll_mg_m3: min_chlorophyll, min_sst_c: min_sst, max_sst_c: max_sst }, cells_scanned: chl.cells.length, sst_available: Boolean(sst), hotspots: named.map((h) => ({ lat: r1(h.lonlat[1]), lon: r1(h.lonlat[0]), chlorophyll_mg_m3: h.value, sst_c: h.sst, distance_from_centre_km: Math.round(haversineKm(centre, h.lonlat)), nearest_place: h.place })), caveat: "Satellite lags about 2 days; near-shore chlorophyll can be turbidity, not fish food." };
    }),

    def("find_nearest_coast", "Geospatial", "Find the nearest stretches of coast to a point (up to 3 different directions) with the distance, bearing, the last sea position before land, and the nearest settlement name. Use it whenever the user has no departure point: a spot chosen on the map, 'how do I reach here', or a position at sea. Then plan_route from a returned sea_edge position (or from a saved location if one is closer) to the target. The coast is derived from the ocean model's land mask, so the named place is a settlement, not a verified harbour.", z.object({ lat, lon, max_km: z.number().min(20).max(400).default(300) }), async ({ lat, lon, max_km }) => {
      const p: LonLat = [lon, lat];
      const c = await nearestCoast(p, max_km);
      r.evidence.set(c.evidence.id, c.evidence);
      r.layers["ports"] = fc(c.coasts.map((h, i) => pt(h.seaEdge, { name: h.name ?? "Coast", rank: i + 1 })));
      r.layers["location"] = fc([pt(p, { name: "Target", role: "dest" })]);
      const all: LonLat[] = [p, ...c.coasts.map((h) => h.seaEdge)];
      r.layers["fit"] = [Math.min(...all.map((q) => q[0])) - 0.3, Math.min(...all.map((q) => q[1])) - 0.3, Math.max(...all.map((q) => q[0])) + 0.3, Math.max(...all.map((q) => q[1])) + 0.3];
      r.blocks.push({ type: "coast", title: c.onLand ? "This point is on land" : c.coasts.length ? `Nearest coast ${c.coasts[0]!.distanceKm} km ${compass(c.coasts[0]!.bearing)}` : `No coast within ${max_km} km`, coasts: c.coasts.map((h) => ({ name: h.name, distance_km: h.distanceKm, direction: compass(h.bearing), sea_edge_lat: r1(h.seaEdge[1]), sea_edge_lon: r1(h.seaEdge[0]) })) });
      return c.onLand ? { on_land: true, note: "The point is on land or too close to shore for the ocean model. Pick a point in the water." } : { coasts: c.coasts.map((h) => ({ nearest_place: h.name, distance_km: h.distanceKm, direction: compass(h.bearing), sea_edge_lat: r1(h.seaEdge[1]), sea_edge_lon: r1(h.seaEdge[0]) })), caveat: "Model coastline (approximate). The place is the nearest settlement, not a verified harbour." };
    }),

    def("plan_route", "Route", "Plan sea routes between two points over a grid sampled from live forecasts: shortest, balanced and safer profiles. Land cells and international boundaries are hard constraints. Coarse decision support, not navigation.", z.object({ from_lat: lat, from_lon: lon, to_lat: lat, to_lon: lon, start: iso, end: iso, speed_knots: z.number().min(2).max(30).default(8) }), async ({ from_lat, from_lon, to_lat, to_lon, start, end, speed_knots }) => {
      const a: LonLat = [from_lon, from_lat], b: LonLat = [to_lon, to_lat];
      if (haversineKm(a, b) > 350) throw new Error("Route longer than 350 km: split it into legs.");
      const w = window(start, end);
      const [grid, bnd] = await Promise.all([buildGrid(a, b, w), boundaries()]);
      grid.evidence.forEach((e) => r.evidence.set(e.id, e));
      r.evidence.set(bnd.evidence.id, bnd.evidence);
      const routes = (["shortest", "balanced", "safer"] as const).map((p) => astar(grid, a, b, p, bnd.lines));
      const ok = routes.filter((x) => x.ok);
      if (!ok.length) throw new Error(routes[0] && !routes[0].ok ? routes[0].reason : "No sea route found.");
      r.layers["routes"] = fc(ok.map((x) => ln(x.coordinates, { profile: x.profile, km: x.distanceKm })));
      r.layers["location"] = fc([pt(a, { name: "Start", role: "start" }), pt(b, { name: "Destination", role: "dest" })]);
      r.layers["fit"] = grid.bbox;
      const rows = ok.map((x) => ({ profile: x.profile, distance_km: x.distanceKm, eta_hours: eta(x.distanceKm, speed_knots), max_wave_m_on_route: x.maxWave, max_wind_kmh_on_route: x.maxWind, boundaries_avoided: x.avoided }));
      r.blocks.push({ type: "route", title: `Route options · ${rows[0]!.distance_km} km`, from: { lat: r1(from_lat), lon: r1(from_lon) }, to: { lat: r1(to_lat), lon: r1(to_lon) }, routes: rows, speedKnots: speed_knots, grid: "14×14 forecast grid" });
      return { routes: rows, objective: "shortest = distance only; balanced = distance + wave/wind penalty; safer = 4× penalty", limits: "Coarse grid (~5–15 km cells), no bathymetry or draft check, not for navigation." };
    }),
  ];

  // Composite: turns "how do I reach this point" into one call, resolving the origin itself so the agent never has to ask for one.
  const call = (name: string, input: unknown) => list.find((t) => t.name === name)!.run(input as never);
  list.push(def("route_to_point", "Route", "Do the whole 'how do I reach this point' job in one call. Give only the target (a map point, a fishing ground, a PFZ). It picks the origin itself (the nearest saved location, otherwise the nearest coast from the ocean model), plans shortest / balanced / safer routes over live forecasts, screens conditions at the target for the next 12 hours, and draws everything on the map. Use it for any request to reach, go to, route to or navigate to a point when the user gave no departure. Optionally pass from_lat/from_lon if the user named a departure.", z.object({ to_lat: lat, to_lon: lon, from_lat: lat.optional(), from_lon: lon.optional(), from_name: z.string().max(80).optional(), speed_knots: z.number().min(2).max(30).default(8) }), async (i) => {
    const target: LonLat = [i.to_lon, i.to_lat];
    type Cand = { name: string; at: LonLat; km: number; how: string };
    let cands: Cand[] = [];
    if (i.from_lat !== undefined && i.from_lon !== undefined) cands = [{ name: i.from_name ?? "Given departure", at: [i.from_lon, i.from_lat], km: haversineKm(target, [i.from_lon, i.from_lat]), how: "given by the user" }];
    else {
      for (const sv of r.saved ?? []) { const km = haversineKm(target, [sv.lon, sv.lat]); if (km <= 350) cands.push({ name: sv.name, at: [sv.lon, sv.lat], km, how: "your saved location" }); }
      const c = await nearestCoast(target, 350);
      r.evidence.set(c.evidence.id, c.evidence);
      if (c.onLand) throw new Error("The target is on land or too close to shore for the ocean model. Pick a point in the water.");
      for (const h of c.coasts) cands.push({ name: h.name ? `${h.name} coast` : "Nearest coast", at: h.seaEdge, km: haversineKm(target, h.seaEdge), how: "nearest coast from the ocean model land mask" });
      cands.sort((a, b) => a.km - b.km);
    }
    const origin = cands[0];
    if (!origin) throw new Error("No coast or saved location within 350 km of the target, so no origin could be chosen.");
    const start = istIso(Date.now());
    const end = istIso(Date.now() + 12 * 3.6e6);
    const safety = await call("assess_safety", { lat: i.to_lat, lon: i.to_lon, start, end }); // first: the route tool sets the final start/destination markers
    const route = await call("plan_route", { from_lat: origin.at[1], from_lon: origin.at[0], to_lat: i.to_lat, to_lon: i.to_lon, start, end, speed_knots: i.speed_knots });
    r.layers["ports"] = fc(cands.slice(0, 3).map((c, k) => pt(c.at, { name: c.name, rank: k + 1 })));
    return {
      origin: { name: origin.name, lat: r1(origin.at[1]), lon: r1(origin.at[0]), straight_line_km: r1(origin.km), chosen_because: `nearest option (${origin.how})` },
      other_origins: cands.slice(1, 3).map((c) => ({ name: c.name, lat: r1(c.at[1]), lon: r1(c.at[0]), straight_line_km: r1(c.km), how: c.how })),
      route, safety_at_destination: safety, window: "now to +12 h",
      assumptions: "Departure now; origin chosen automatically. The coast is the ocean model's approximate land mask and the origin is a sea position beside the shore, not a verified harbour. Coarse grid, not navigation.",
    };
  }));
  return list;
}
