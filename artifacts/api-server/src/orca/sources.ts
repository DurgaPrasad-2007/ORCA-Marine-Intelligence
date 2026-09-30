// Data adapters. Each returns values plus an Evidence record (provenance + freshness).
// Adding a real provider = add a function here with the same return shape.
import { cached, fetchJson, fetchText } from "./net";
import { bearingDeg, destination, haversineKm, nearestOnLine, nearestPolygonKm, pointInPolygon, type Boundary, type LonLat } from "./geo";

export type SourceStatus = "live" | "recent" | "stale" | "historical" | "static-demo" | "unavailable" | "derived";

export type Evidence = {
  id: string;
  source: string;
  product: string;
  url: string;
  status: SourceStatus;
  observedAt?: string;
  validFrom?: string;
  validTo?: string;
  retrievedAt: string;
  resolution?: string;
  note?: string;
};

const now = () => new Date().toISOString();
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Freshness from observation age vs the product's normal latency. */
export function freshness(observedAt: string | undefined, expectedLagHours: number): SourceStatus {
  if (!observedAt) return "unavailable";
  const ageH = (Date.now() - Date.parse(observedAt)) / 3.6e6;
  if (ageH <= expectedLagHours) return "live";
  if (ageH <= expectedLagHours * 2) return "recent";
  return "stale";
}

// ---------------------------------------------------------------- Open-Meteo forecast
export type Hourly = { time: string[]; [k: string]: Array<number | null> | string[] };
const MARINE_VARS = "wave_height,wave_direction,wave_period,swell_wave_height,sea_level_height_msl,ocean_current_velocity,ocean_current_direction,sea_surface_temperature";
const WEATHER_VARS = "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,precipitation,weather_code,visibility,cape";

type OMResponse = { latitude: number; longitude: number; hourly?: Hourly; hourly_units?: Record<string, string> };

async function openMeteo(host: string, path: string, vars: string, pts: LonLat[], pastDays: number) {
  const q = new URLSearchParams({
    latitude: pts.map((p) => p[1].toFixed(3)).join(","),
    longitude: pts.map((p) => p[0].toFixed(3)).join(","),
    hourly: vars,
    timezone: "Asia/Kolkata",
    forecast_days: "3",
    past_days: String(pastDays),
  });
  const url = `https://${host}${path}?${q}`;
  const key = `${host}|${q}`;
  const res = await cached(key, 30 * 60_000, () => fetchJson<OMResponse | OMResponse[]>(url));
  return { url, results: Array.isArray(res) ? res : [res] };
}

export async function marineForecast(pts: LonLat[], pastDays = 0) {
  const { url, results } = await openMeteo("marine-api.open-meteo.com", "/v1/marine", MARINE_VARS, pts, pastDays);
  return {
    series: results.map((r) => r.hourly),
    evidence: {
      id: "E-OM-MARINE",
      source: "Open-Meteo Marine API (ECMWF WAM / MeteoFrance MFWAM / Copernicus blends)",
      product: "Hourly wave, swell, sea level, current and SST forecast",
      url,
      status: "live",
      validFrom: results[0]?.hourly?.time[0] ? `${results[0].hourly.time[0]}+05:30` : undefined,
      validTo: results[0]?.hourly?.time.at(-1) ? `${results[0].hourly.time.at(-1)}+05:30` : undefined,
      retrievedAt: now(),
      resolution: "~5–25 km, hourly",
      note: "Model forecast. Sea level is model-derived and not for navigation.",
    } satisfies Evidence,
  };
}

export async function weatherForecast(pts: LonLat[], pastDays = 0) {
  const { url, results } = await openMeteo("api.open-meteo.com", "/v1/forecast", WEATHER_VARS, pts, pastDays);
  return {
    series: results.map((r) => r.hourly),
    evidence: {
      id: "E-OM-WEATHER",
      source: "Open-Meteo Forecast API (best-match NWP incl. ECMWF IFS, GFS)",
      product: "Hourly wind, gusts, rain, thunderstorm code, visibility, CAPE",
      url,
      status: "live",
      validFrom: results[0]?.hourly?.time[0] ? `${results[0].hourly.time[0]}+05:30` : undefined,
      validTo: results[0]?.hourly?.time.at(-1) ? `${results[0].hourly.time.at(-1)}+05:30` : undefined,
      retrievedAt: now(),
      resolution: "~9–25 km, hourly",
      note: "Thunderstorm is inferred from WMO weather codes 95–99. This is not lightning detection.",
    } satisfies Evidence,
  };
}

// ---------------------------------------------------------------- NOAA ERDDAP (satellite)
type ErddapTable = { table: { columnNames: string[]; rows: Array<Array<string | number | null>> } };

const ERDDAP = {
  sst: {
    base: "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21NrtAgg",
    varName: "sst",
    product: "NOAA OISST v2.1 NRT daily SST (AVHRR + in-situ)",
    resolution: "0.25°, daily",
    lagH: 72,
  },
  chl: {
    base: "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPN20VIIRSDINEOFDaily",
    varName: "chlor_a",
    product: "VIIRS SNPP+NOAA-20 gap-filled (DINEOF) chlorophyll-a",
    resolution: "~9 km, daily",
    lagH: 72,
  },
} as const;
export type EoVar = keyof typeof ERDDAP;

function erddapEvidence(v: EoVar, url: string, observedAt?: string, note?: string): Evidence {
  const d = ERDDAP[v];
  return {
    id: v === "sst" ? "E-NOAA-SST" : "E-NOAA-CHL",
    source: "NOAA CoastWatch ERDDAP",
    product: d.product,
    url,
    status: freshness(observedAt, d.lagH),
    observedAt,
    retrievedAt: now(),
    resolution: d.resolution,
    note,
  };
}

/** Daily time series at the nearest sea cell (within ±0.3°) to a point; harbours often sit on land-masked cells.
 *  `timeSel` is ERDDAP index syntax e.g. "last-7:last" or "(2025-09-01):(2025-09-30)". */
export async function eoPointSeries(v: EoVar, p: LonLat, timeSel = "last-7:last") {
  const d = ERDDAP[v];
  const r = (x: number) => x.toFixed(2);
  const url = `${d.base}.json?${d.varName}[${timeSel}][0][(${r(p[1] - 0.3)}):(${r(p[1] + 0.3)})][(${r(p[0] - 0.3)}):(${r(p[0] + 0.3)})]`;
  const res = await cached(url, 3 * 3.6e6, () => fetchJson<ErddapTable>(url, { timeoutMs: 30_000 }));
  const cells = new Map<string, Array<{ time: string; value: number }>>();
  for (const row of res.table.rows) {
    if (typeof row[4] !== "number") continue;
    const k = `${row[3]},${row[2]}`;
    cells.set(k, [...(cells.get(k) ?? []), { time: String(row[0]), value: round(row[4], 3) }]);
  }
  let best: { k: string; km: number } | null = null;
  for (const [k, rows] of cells) {
    if (rows.length < 2) continue;
    const [lon, lat] = k.split(",").map(Number) as LonLat;
    const km = haversineKm(p, [lon, lat]);
    if (!best || km < best.km) best = { k, km };
  }
  const rows = best ? cells.get(best.k)! : [];
  const note = best ? `Nearest valid sea cell ${best.km.toFixed(1)} km from the requested point (${best.k.split(",").reverse().join("°N, ")}°E).` : "No valid sea cell within ±0.3°.";
  return { rows, evidence: erddapEvidence(v, url, rows.at(-1)?.time, note) };
}

/** Latest grid over a bbox, strided. Returns cells with values (NaN/land dropped). */
export async function eoGrid(v: EoVar, bbox: [number, number, number, number], stride: number) {
  const d = ERDDAP[v];
  const [w, s, e, n] = bbox.map((x) => x.toFixed(2));
  // Both datasets store latitude ascending.
  const url = `${d.base}.json?${d.varName}[last][0][(${s}):${stride}:(${n})][(${w}):${stride}:(${e})]`;
  const res = await cached(url, 3 * 3.6e6, () => fetchJson<ErddapTable>(url, { timeoutMs: 30_000 }));
  const cells = res.table.rows
    .filter((r) => typeof r[4] === "number")
    .map((r) => ({ lonlat: [r[3] as number, r[2] as number] as LonLat, value: round(r[4] as number, 3) }));
  return { cells, time: String(res.table.rows[0]?.[0] ?? ""), evidence: erddapEvidence(v, url, String(res.table.rows[0]?.[0] ?? "") || undefined) };
}

// ---------------------------------------------------------------- INCOIS PFZ (live)
export type PfzFeature = {
  id: string;
  sector: string;
  issued: string; // ISO date derived from Year + Julian_day
  coordinates: LonLat[][];
};

const PFZ_WMS = "https://incois.gov.in/geoserver/PFZ_Automation/wms";

function julianToDate(year: number, jd: number) {
  return new Date(Date.UTC(year, 0, jd)).toISOString().slice(0, 10);
}

async function pfzTile(bbox: string, x: number, y: number) {
  const q = new URLSearchParams({
    SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetFeatureInfo",
    LAYERS: "PFZ_Automation:pfzlines", QUERY_LAYERS: "PFZ_Automation:pfzlines",
    SRS: "EPSG:4326", BBOX: bbox, WIDTH: "101", HEIGHT: "101", X: String(x), Y: String(y),
    BUFFER: "8", INFO_FORMAT: "application/json", FEATURE_COUNT: "500",
  });
  const res = await fetchJson<{ features: Array<{ id: string; geometry: { coordinates: LonLat[][] }; properties: Record<string, unknown> }> }>(`${PFZ_WMS}?${q}`, { timeoutMs: 30_000 });
  return res.features;
}

// ponytail: WFS on this GeoServer returns 503, so we sweep GetFeatureInfo over a grid of
// "clicks" (~200 small requests, run 8 at a time, cached 3 h). Switch to WFS or an official feed if INCOIS provides one.
async function harvestPfz(): Promise<PfzFeature[]> {
  const jobs: Array<[string, number, number]> = [];
  for (const bbox of ["66,6,80,24", "76,6,90,24", "90,6,94,14"])
    for (let x = 5; x < 101; x += 10) for (let y = 5; y < 101; y += 10) jobs.push([bbox, x, y]);
  const seen = new Map<string, PfzFeature>();
  let failures = 0;
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = await Promise.allSettled(jobs.slice(i, i + 8).map(([b, x, y]) => pfzTile(b, x, y)));
    for (const r of batch) {
      if (r.status === "rejected") { failures++; continue; }
      for (const f of r.value) {
        const p = f.properties;
        seen.set(f.id, {
          id: String(p["UID"] ?? f.id),
          sector: String(p["State_Name"] ?? "Unknown"),
          issued: julianToDate(Number(p["Year"]), Number(p["Julian_day"])),
          coordinates: f.geometry.coordinates,
        });
      }
    }
    if (failures > 20) throw new Error("INCOIS PFZ service unreachable");
  }
  return [...seen.values()];
}

export async function pfzFeatures() {
  const url = `${PFZ_WMS} (layer PFZ_Automation:pfzlines)`;
  const features = await cached("pfz:all", 3 * 3.6e6, harvestPfz);
  const issued = features.map((f) => f.issued).sort().at(-1);
  return {
    features,
    evidence: {
      id: "E-INCOIS-PFZ",
      source: "INCOIS (ESSO-MoES) PFZ Advisory",
      product: "Potential Fishing Zone lines from satellite SST and chlorophyll (Oceansat, NOAA-AVHRR, MetOp, MODIS)",
      url,
      // PFZ is issued ~3x/week and valid ~2-3 days
      status: freshness(issued ? `${issued}T12:00:00+05:30` : undefined, 72),
      observedAt: issued,
      retrievedAt: now(),
      resolution: "Vector lines, ~1 km",
      note: `${features.length} PFZ lines across the Indian coast. Retrieved from the public INCOIS GeoServer through WMS GetFeatureInfo.`,
    } satisfies Evidence,
  };
}
export const warmPfz = () => pfzFeatures().catch(() => undefined);

// ---------------------------------------------------------------- NDMA SACHET CAP alerts (official)
export type CapAlert = { id: string; title: string; sender: string; published: string; link: string };
export type CapDetail = { event: string; severity: string; urgency: string; certainty: string; expires: string | null; areaDesc: string };
const CAP_RSS = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";

const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

export function parseCapRss(xml: string): CapAlert[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    // allow attributes on the tag (<guid isPermaLink="false">)
    const tag = (t: string) => decode(m[1]!.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`))?.[1] ?? "");
    const title = tag("title");
    return {
      id: tag("guid") || tag("link").match(/identifier=(\d+)/)?.[1] || "",
      title,
      sender: tag("author").replace(/^.*\(|\)$/g, ""),
      published: new Date(tag("pubDate")).toISOString(),
      link: tag("link"),
    };
  });
}

export async function capAlerts() {
  const xml = await cached("cap", 10 * 60_000, () => fetchText(CAP_RSS));
  const items = parseCapRss(xml);
  return {
    items,
    evidence: {
      id: "E-NDMA-CAP",
      source: "NDMA SACHET Common Alerting Protocol feed (IMD, INCOIS, CWC, SDMAs)",
      product: "Official CAP 1.2 alerts, all India",
      url: CAP_RSS,
      status: "live",
      observedAt: items.map((i) => i.published).sort().at(-1),
      retrievedAt: now(),
      note: "Alerts are matched to a point by their published CAP polygon (inside or within 25 km). Name matching is used only if a polygon is unavailable.",
    } satisfies Evidence,
  };
}

// Alert area geometry: CAP items publish a "Polygon URL" (FetchPolygonXMLFile) with lat,lon rings.
// ponytail: polygons are fetched lazily per alert and cached 6 h; ~20 recent alerts is fine, cache to disk if the feed grows.
let polygonBlockedUntil = 0; // the polygon sub-endpoint can answer 403 while the feed itself is fine; do not hammer it
export async function alertRings(alertId: string): Promise<LonLat[][] | null> {
  const identifier = alertId.replace(/\D/g, "");
  if (!identifier || Date.now() < polygonBlockedUntil) return null;
  const url = `https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=${identifier}`;
  try {
    const xml = await cached(url, 6 * 3.6e6, () => fetchText(url, { timeoutMs: 20_000 }));
    const rings = [...xml.matchAll(/<polygon>([^<]+)<\/polygon>/g)].map((m) =>
      m[1]!.trim().split(/\s+/).map((pair) => pair.split(",").map(Number) as [number, number]).filter((c) => c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])).map(([lat, lon]) => [lon, lat] as LonLat),
    ).filter((r) => r.length >= 3);
    return rings.length ? rings : null;
  } catch (err) {
    if (/HTTP 403/.test(err instanceof Error ? err.message : "")) polygonBlockedUntil = Date.now() + 10 * 60_000;
    return null;
  }
}

/** Structured hazard fields from the full CAP 1.2 file (event, severity, urgency, expiry, area names). */
export async function capDetail(alertId: string): Promise<CapDetail | null> {
  const identifier = alertId.replace(/\D/g, "");
  if (!identifier) return null;
  const url = `https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${identifier}`;
  try {
    const xml = await cached(url, 6 * 3.6e6, () => fetchText(url, { timeoutMs: 20_000 }));
    const info = xml.split("<cap:info>")[1] ?? "";
    const tag = (t: string) => decode(info.match(new RegExp(`<cap:${t}>([^<]*)</cap:${t}>`))?.[1] ?? "");
    return { event: tag("event"), severity: tag("severity"), urgency: tag("urgency"), certainty: tag("certainty"), expires: tag("expires") || null, areaDesc: tag("areaDesc") };
  } catch {
    return null;
  }
}

/** District / county / town names around a point (Nominatim, cached). Null over open sea. Used only to match published area names. */
async function areaNames(p: LonLat): Promise<string[] | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&addressdetails=1&lat=${p[1].toFixed(3)}&lon=${p[0].toFixed(3)}`;
  try {
    const r = await cached(url, 7 * 24 * 3.6e6, () => fetchJson<{ address?: Record<string, string> }>(url, { headers: { "User-Agent": "orca-marine-intelligence/1.0 (ISRO SIH 2026 prototype)" } }));
    const a = r.address ?? {};
    const names = [a["state_district"], a["county"], a["city"], a["town"]].filter((x): x is string => Boolean(x)).map((x) => x.replace(/ district$/i, "").trim()).filter((x) => x.length >= 4);
    return names.length ? names : null;
  } catch {
    return null;
  }
}

/** Alerts whose published CAP area contains the point or lies within `nearKm` of it (district polygons are land-only, boats are at sea).
 *  `unresolved` counts recent alerts whose polygon could not be fetched, so callers can say the check was incomplete. */
export async function alertsNear(items: CapAlert[], p: LonLat, nearKm = 25, maxAgeH = 36) {
  const cutoff = Date.now() - maxAgeH * 3.6e6;
  // CWC river-flood alerts are excluded: not marine hazards, and each needs a large polygon download.
  const recent = items.filter((a) => Date.parse(a.published) >= cutoff && a.sender !== "CWC");
  const names = await areaNames(p);
  const checked = await Promise.all(
    recent.map(async (a) => {
      const [rings, detail] = await Promise.all([alertRings(a.id), capDetail(a.id)]);
      if (detail?.expires && Date.parse(detail.expires) < Date.now()) return "expired" as const;
      const extra = { event: detail?.event ?? null, severity: detail?.severity ?? null, urgency: detail?.urgency ?? null, expires: detail?.expires ?? null };
      if (rings) {
        let km = Infinity;
        for (const r of rings) km = Math.min(km, pointInPolygon(p, r) ? 0 : nearestOnLine(p, r).km);
        return km <= nearKm ? { ...a, ...extra, distKm: Math.round(km), rings, matchedBy: "alert polygon" as const } : null;
      }
      // Polygon unavailable: match the point's district name against the alert's published area names.
      if (detail && names) {
        const hay = detail.areaDesc.toLowerCase();
        return names.some((n) => hay.includes(n.toLowerCase())) ? { ...a, ...extra, distKm: 0, rings: undefined, matchedBy: "district name" as const } : null;
      }
      return "unresolved" as const;
    }),
  );
  return {
    matches: checked.filter((a): a is Exclude<typeof a, null | "unresolved" | "expired"> => a !== null && a !== "unresolved" && a !== "expired"),
    unresolved: checked.filter((a) => a === "unresolved").length,
    considered: checked.filter((a) => a !== "expired").length,
  };
}

// ---------------------------------------------------------------- GDACS tropical cyclones
export async function cyclonesNear(p: LonLat) {
  const url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP";
  type G = { features: Array<{ geometry: { coordinates: LonLat }; properties: Record<string, unknown> }> };
  const res = await cached("gdacs", 30 * 60_000, () => fetchJson<G>(url));
  const events = res.features
    .filter((f) => f.properties["eventtype"] === "TC" && f.properties["iscurrent"] === "true")
    .map((f) => ({
      name: String(f.properties["eventname"] ?? f.properties["name"]),
      alertLevel: String(f.properties["alertlevel"]),
      lonlat: f.geometry.coordinates,
      km: Math.round(haversineKm(p, f.geometry.coordinates)),
      report: String((f.properties["url"] as Record<string, string>)?.["report"] ?? ""),
    }))
    .sort((a, b) => a.km - b.km);
  return {
    events,
    evidence: {
      id: "E-GDACS-TC",
      source: "GDACS (EC JRC / UN OCHA)",
      product: "Current tropical cyclone events",
      url,
      status: "live",
      retrievedAt: now(),
      note: "Global feed. IMD RSMC New Delhi is the authoritative source for the North Indian Ocean.",
    } satisfies Evidence,
  };
}

// ---------------------------------------------------------------- Geocoding (live)
export type Place = { name: string; admin: string; state: string; coastal: boolean; lonlat: LonLat };

// States and UTs with a sea coast. Town names repeat across India (there are Dighas in Bihar, Rajasthan and Uttar Pradesh),
// so candidates in coastal states are ranked first and flagged for the agent to choose between.
const COASTAL_STATES = new Set(["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu", "Puducherry", "Andhra Pradesh", "Odisha", "West Bengal", "Andaman and Nicobar", "Andaman and Nicobar Islands", "Lakshadweep", "Daman and Diu", "Dadra and Nagar Haveli and Daman and Diu"]);

export async function geocode(name: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: "8", countryCode: "IN" })}`;
  type R = { results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; admin2?: string }> };
  const res = (await cached(url, 24 * 3.6e6, () => fetchJson<R>(url))).results ?? [];
  const places = res.map((r): Place => ({ name: r.name, admin: [r.admin2?.replace(/ District$/, ""), r.admin1].filter(Boolean).join(", "), state: r.admin1 ?? "", coastal: COASTAL_STATES.has(r.admin1 ?? ""), lonlat: [r.longitude, r.latitude] }));
  return {
    matches: [...places.filter((p) => p.coastal), ...places.filter((p) => !p.coastal)].slice(0, 4),
    evidence: { id: "E-GEOCODE", source: "Open-Meteo Geocoding (GeoNames)", product: "Place search", url, status: "live", retrievedAt: now() } satisfies Evidence,
  };
}

/** Name of a settlement/district at a point (OpenStreetMap Nominatim; fair-use, cached). Country- or state-level answers
 *  (what it returns for open sea) are rejected, so callers fall back to coordinates instead of a misleading label. */
export async function reverseName(p: LonLat): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${p[1].toFixed(2)}&lon=${p[0].toFixed(2)}`;
  try {
    const r = await cached(url, 7 * 24 * 3.6e6, () => fetchJson<{ name?: string; addresstype?: string; address?: Record<string, string> }>(url, { headers: { "User-Agent": "orca-marine-intelligence/1.0 (ISRO SIH 2026 prototype)" } }));
    if (!r.name || ["country", "state", "region"].includes(r.addresstype ?? "")) return null;
    return [r.name, r.address?.["state"]].filter(Boolean).join(", ");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- International maritime boundaries (Marine Regions, VLIZ; CC-BY)
const MR_WFS = "https://geo.vliz.be/geoserver/MarineRegions/ows";
const BOUNDARY_TYPES = new Set(["Treaty", "Median line", "Court ruling", "200 NM"]);

export async function boundaries() {
  const q = new URLSearchParams({ service: "WFS", version: "1.0.0", request: "GetFeature", typeName: "MarineRegions:eez_boundaries", outputFormat: "application/json", cql_filter: "sovereign1='India' OR sovereign2='India'" });
  type F = { features: Array<{ properties: Record<string, string | null>; geometry: { coordinates: LonLat[][] } }> };
  const grouped = await cached("mr:boundaries", 24 * 3.6e6, async () => {
    const res = await fetchJson<F>(`${MR_WFS}?${q}`, { timeoutMs: 60_000 });
    const byName = new Map<string, Boundary>();
    for (const f of res.features) {
      const type = f.properties["line_type"] ?? "";
      if (!BOUNDARY_TYPES.has(type)) continue;
      const name = type === "200 NM" ? "Indian EEZ outer limit (200 NM)" : `${f.properties["line_name"]} (${type.toLowerCase()})`;
      const b = byName.get(name) ?? { name, type, agreement: f.properties["source1"] ?? null, lines: [] };
      b.lines.push(...f.geometry.coordinates.map((l) => l.map(([x, y]) => [x, y] as LonLat)));
      byName.set(name, b);
    }
    return [...byName.values()];
  });
  return {
    lines: grouped,
    evidence: {
      id: "E-MARINEREGIONS",
      source: "Marine Regions, Flanders Marine Institute (VLIZ) – Maritime Boundaries v12",
      product: "International maritime boundaries and 200 NM limit involving India",
      url: `${MR_WFS} (layer MarineRegions:eez_boundaries)`,
      status: "live",
      retrievedAt: now(),
      note: "CC-BY. Boundaries are for information, not legal delimitation. Marine protected areas and restricted/danger zones have no verified live public source and are NOT covered.",
    } satisfies Evidence,
  };
}

// ---------------------------------------------------------------- Protected areas (UNEP-WCMC / IUCN World Database on Protected Areas)
export type ProtectedArea = { name: string; designation: string; realm: string; iucn: string | null; polygons: LonLat[][][]; point?: LonLat };
const WDPA = "https://data-gis.unep-wcmc.org/server/rest/services/ProtectedSites/The_World_Database_of_Protected_Areas/FeatureServer";

export async function protectedAreas() {
  const areas = await cached("wdpa:ind", 24 * 3.6e6, async () => {
    const q = (layer: number, extra: Record<string, string>, where: string) => `${WDPA}/${layer}/query?${new URLSearchParams({ where, outSR: "4326", ...extra })}`;
    type Poly = { features: Array<{ properties: Record<string, string | null>; geometry: { type: string; coordinates: LonLat[][] | LonLat[][][] } }> };
    type Pts = { features?: Array<{ attributes: Record<string, string | null>; geometry?: { points: LonLat[] } }> };
    const [poly, pts] = await Promise.all([
      fetchJson<Poly>(q(1, { outFields: "name_eng,desig_eng,iucn_cat,realm", maxAllowableOffset: "0.005", f: "geojson" }, "iso3='IND'"), { timeoutMs: 60_000 }),
      fetchJson<Pts>(q(0, { outFields: "name_eng,desig_eng,iucn_cat,realm", f: "json" }, "iso3='IND' AND realm IN ('Marine','Coastal')"), { timeoutMs: 60_000 }).catch(() => ({ features: [] }) as Pts),
    ]);
    const out: ProtectedArea[] = poly.features.map((f) => ({
      name: f.properties["name_eng"] ?? "Protected area", designation: f.properties["desig_eng"] ?? "", realm: f.properties["realm"] ?? "", iucn: f.properties["iucn_cat"] ?? null,
      polygons: (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]) as LonLat[][][],
    }));
    for (const f of pts.features ?? []) {
      const pt = f.geometry?.points?.[0];
      if (pt) out.push({ name: f.attributes["name_eng"] ?? "Protected area", designation: `${f.attributes["desig_eng"] ?? ""} (boundary not published, point only)`, realm: f.attributes["realm"] ?? "", iucn: f.attributes["iucn_cat"] ?? null, polygons: [], point: pt });
    }
    return out;
  });
  return {
    areas,
    evidence: {
      id: "E-WDPA",
      source: "UNEP-WCMC & IUCN, World Database on Protected Areas (public ArcGIS service)",
      product: "Protected area boundaries for India",
      url: `${WDPA}/1`,
      status: "live",
      retrievedAt: now(),
      note: "Coverage of India in this public service is partial (about 60 polygons and a few marine point sites). A miss does not mean no protected or restricted area exists. Boundaries are informational, not legal.",
    } satisfies Evidence,
  };
}

/** Protected areas within `withinKm` of a point, nearest first. Point-only sites are measured to their reported point. */
export function protectedNear(p: LonLat, areas: ProtectedArea[], withinKm: number) {
  return areas
    .map((a) => {
      const d = a.polygons.length ? nearestPolygonKm(p, a.polygons) : { inside: false, km: Math.round(haversineKm(p, a.point!) * 10) / 10 };
      return { name: a.name, designation: a.designation, realm: a.realm, iucn: a.iucn, inside: d.inside, km: d.km, boundaryPublished: a.polygons.length > 0, polygons: a.polygons, point: a.point };
    })
    .filter((a) => a.km <= withinKm)
    .sort((a, b) => a.km - b.km);
}

// ---------------------------------------------------------------- Nearest coast (derived from the live ocean model's own land mask)
/** True where the ocean model has no sea value (land, or too close to shore). One light request per chunk of points. */
async function isLand(pts: LonLat[]): Promise<boolean[]> {
  const out: boolean[] = [];
  for (let i = 0; i < pts.length; i += 60) {
    const chunk = pts.slice(i, i + 60);
    const q = new URLSearchParams({ latitude: chunk.map((p) => p[1].toFixed(3)).join(","), longitude: chunk.map((p) => p[0].toFixed(3)).join(","), hourly: "wave_height", forecast_days: "1", timezone: "Asia/Kolkata" });
    const url = `https://marine-api.open-meteo.com/v1/marine?${q}`;
    const res = await cached(url, 24 * 3.6e6, () => fetchJson<OMResponse | OMResponse[]>(url, { timeoutMs: 30_000 }));
    for (const r of Array.isArray(res) ? res : [res]) out.push(!(r.hourly?.["wave_height"] as Array<number | null> | undefined)?.some((v) => typeof v === "number"));
  }
  return out;
}

/** Nearest stretches of coast from a point. Searches outward ring by ring (20 km steps, 12 bearings) and stops once three
 *  different directions have hit land, so a nearby coast costs about 60 probes instead of hundreds; each hit is then refined to 5 km. */
export async function nearestCoast(p: LonLat, maxKm = 300) {
  const bearings = Array.from({ length: 12 }, (_, i) => i * 30);
  const [origin] = await isLand([p]);
  const onLand = origin!;
  const first = new Map<number, number>(); // bearing -> first radius that is land
  for (let r = 20; r <= maxKm && first.size < 3 && !onLand; r += 20) {
    const open = bearings.filter((b) => !first.has(b));
    const land = await isLand(open.map((b) => destination(p, b, r)));
    open.forEach((b, i) => { if (land[i]) first.set(b, r); });
  }
  const hits = await Promise.all([...first].map(async ([b, r]) => {
    // refine within the last 20 km bracket: 5, 10, 15 km inside the bracket
    const steps = [r - 15, r - 10, r - 5].filter((x) => x > 0);
    const land = await isLand(steps.map((x) => destination(p, b, x)));
    const k = land.findIndex(Boolean);
    const landKm = k < 0 ? r : steps[k]!;
    const seaKm = k === 0 ? Math.max(landKm - 5, 0) : k < 0 ? steps[steps.length - 1] ?? r - 20 : steps[k - 1]!;
    return { bearing: b, distanceKm: landKm, seaEdge: seaKm <= 0 ? p : destination(p, b, seaKm), landPoint: destination(p, b, landKm) };
  }));
  // nearest first, then keep stretches at least 45 degrees apart so the alternatives are genuinely different
  const chosen: typeof hits = [];
  for (const h of [...hits].sort((a, b) => a.distanceKm - b.distanceKm)) if (chosen.every((c) => Math.min(Math.abs(c.bearing - h.bearing), 360 - Math.abs(c.bearing - h.bearing)) >= 45)) chosen.push(h);
  const named = await Promise.all(chosen.slice(0, 3).map(async (h) => ({ ...h, name: await reverseName(h.landPoint) })));
  return {
    onLand,
    coasts: named,
    evidence: { id: "E-COAST", source: "Derived from the Open-Meteo marine model land mask + OpenStreetMap Nominatim place names", product: "Nearest coast from a point", url: "https://marine-api.open-meteo.com/v1/marine", status: "derived", retrievedAt: now(), resolution: "10 km along 16 bearings", note: "The model coastline is approximate (5-25 km grid). The named place is the nearest settlement to the shore point, not a verified harbour or landing site." } satisfies Evidence,
    bearingTo: (q: LonLat) => bearingDeg(p, q),
  };
}
