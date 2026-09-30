// Transparent, deterministic marine risk model. Thresholds and their basis are in
// docs/RESEARCH.md §3. Confidence is a labelled heuristic, not a probability.
import type { Hourly } from "./sources";

export type Level = "ok" | "caution" | "avoid" | "unknown";
export type Basis = "operational (IMD)" | "scientific (WMO sea state)" | "demo threshold" | "official alert";
export type Factor = {
  key: "wave" | "wind" | "gust" | "thunder" | "rain" | "visibility" | "cyclone" | "official" | "geofence" | "protected";
  label: string;
  value: string;
  level: Level;
  threshold: string;
  basis: Basis;
  evidence: string[];
};

export const THRESHOLDS = {
  wave: { caution: 1.25, avoid: 2.5, basis: "scientific (WMO sea state)" as Basis },
  wind: { caution: 35, avoid: 45, basis: "operational (IMD)" as Basis },
  gust: { caution: 55, avoid: 65, basis: "operational (IMD)" as Basis },
  rainProb: { caution: 70 },
  visibilityM: { caution: 2000, avoid: 1000 },
  cycloneKm: { caution: 1000, avoid: 500 },
};

export type Window = { start: Date; end: Date; label: string };

/** Indices of an hourly series (IST local strings) that fall in the window. */
export function windowIdx(times: string[], w: Window): number[] {
  const out: number[] = [];
  times.forEach((t, i) => {
    const ms = Date.parse(`${t}:00+05:30`);
    if (ms >= w.start.getTime() && ms < w.end.getTime()) out.push(i);
  });
  return out;
}

const nums = (s: Hourly | undefined, k: string, idx: number[]) =>
  idx.map((i) => (s?.[k] as Array<number | null> | undefined)?.[i]).filter((v): v is number => typeof v === "number");
const max = (a: number[]) => (a.length ? Math.max(...a) : null);
const min = (a: number[]) => (a.length ? Math.min(...a) : null);
const lvl = (v: number | null, c: number, a: number, invert = false): Level =>
  v === null ? "unknown" : invert ? (v <= a ? "avoid" : v <= c ? "caution" : "ok") : v >= a ? "avoid" : v >= c ? "caution" : "ok";

export function assess(
  marine: Hourly | undefined,
  weather: Hourly | undefined,
  w: Window,
  extra: { cycloneKm?: number | null; officialAlerts?: Array<{ title: string }>; geofence?: { name: string; inside: boolean; km: number } | null; protectedArea?: { name: string; inside: boolean; km: number } | null },
) {
  const mi = marine ? windowIdx(marine.time, w) : [];
  const wi = weather ? windowIdx(weather.time, w) : [];
  const wave = max(nums(marine, "wave_height", mi));
  const wind = max(nums(weather, "wind_speed_10m", wi));
  const gust = max(nums(weather, "wind_gusts_10m", wi));
  const rain = max(nums(weather, "precipitation_probability", wi));
  const vis = min(nums(weather, "visibility", wi));
  const codes = nums(weather, "weather_code", wi);
  const thunderHours = codes.filter((c) => c >= 95).length;
  const T = THRESHOLDS;

  const factors: Factor[] = [
    { key: "wave", label: "Significant wave height", value: wave === null ? "no data" : `${wave.toFixed(1)} m`, level: lvl(wave, T.wave.caution, T.wave.avoid), threshold: `caution ≥${T.wave.caution} m (moderate sea), avoid ≥${T.wave.avoid} m (rough sea)`, basis: T.wave.basis, evidence: ["E-OM-MARINE"] },
    { key: "wind", label: "Sustained wind", value: wind === null ? "no data" : `${Math.round(wind)} km/h`, level: lvl(wind, T.wind.caution, T.wind.avoid), threshold: `caution ≥${T.wind.caution}, avoid ≥${T.wind.avoid} km/h`, basis: T.wind.basis, evidence: ["E-OM-WEATHER"] },
    { key: "gust", label: "Wind gusts", value: gust === null ? "no data" : `${Math.round(gust)} km/h`, level: lvl(gust, T.gust.caution, T.gust.avoid), threshold: `caution ≥${T.gust.caution}, avoid ≥${T.gust.avoid} km/h`, basis: T.gust.basis, evidence: ["E-OM-WEATHER"] },
    { key: "thunder", label: "Thunderstorm (forecast proxy for lightning)", value: weather ? (thunderHours ? `${thunderHours} h forecast` : "none forecast") : "no data", level: weather ? (thunderHours >= 2 ? "avoid" : thunderHours ? "caution" : "ok") : "unknown", threshold: "caution at 1 forecast hour, avoid at ≥2 (WMO codes 95–99)", basis: "demo threshold", evidence: ["E-OM-WEATHER"] },
    { key: "rain", label: "Rain probability", value: rain === null ? "no data" : `${Math.round(rain)}%`, level: rain === null ? "unknown" : rain >= T.rainProb.caution ? "caution" : "ok", threshold: `caution ≥${T.rainProb.caution}%`, basis: "demo threshold", evidence: ["E-OM-WEATHER"] },
    { key: "visibility", label: "Visibility", value: vis === null ? "no data" : `${(vis / 1000).toFixed(1)} km`, level: lvl(vis, T.visibilityM.caution, 0, true), threshold: "caution ≤2 km (demo thresholds never escalate to avoid on their own)", basis: "demo threshold", evidence: ["E-OM-WEATHER"] },
  ];
  if (extra.cycloneKm !== undefined)
    factors.push({ key: "cyclone", label: "Tropical cyclone proximity", value: extra.cycloneKm === null ? "none active" : `${extra.cycloneKm} km`, level: extra.cycloneKm === null ? "ok" : lvl(-extra.cycloneKm, -T.cycloneKm.caution, -T.cycloneKm.avoid), threshold: "caution <1000 km, avoid <500 km", basis: "demo threshold", evidence: ["E-GDACS-TC"] });
  if (extra.officialAlerts) {
    const n = extra.officialAlerts.length;
    // Each alert carries a CAP hazard event and severity, but which events matter at sea is a judgement for the agent.
    // Any alert near the point raises caution; the agent reads the titles and must say when one is a marine hazard.
    factors.push({ key: "official", label: "Official CAP alerts within 25 km", value: n ? `${n} active - read the alert text` : "none matched", level: n ? "caution" : "ok", threshold: "any official alert nearby = caution; the alert text decides how serious", basis: "official alert", evidence: ["E-NDMA-CAP"] });
  }
  if (extra.geofence)
    factors.push({ key: "geofence", label: "Boundary / protected area", value: extra.geofence.inside ? `inside ${extra.geofence.name}` : `${extra.geofence.km.toFixed(0)} km from ${extra.geofence.name}`, level: extra.geofence.inside ? "avoid" : extra.geofence.km < 5 ? "caution" : "ok", threshold: "inside = avoid, <5 km = caution", basis: "demo threshold", evidence: ["E-GEOFENCE"] });

  if (extra.protectedArea) {
    const pa = extra.protectedArea;
    factors.push({ key: "protected", label: "Protected area (WDPA)", value: pa.inside ? `inside ${pa.name}` : `${pa.km.toFixed(0)} km from ${pa.name}`, level: pa.inside || pa.km < 5 ? "caution" : "ok", threshold: "inside or < 5 km = caution: fishing may be regulated here, verify local rules", basis: "demo threshold", evidence: ["E-WDPA"] });
  }

  const core = factors.filter((f) => ["wave", "wind", "gust"].includes(f.key));
  const overall: "SAFE" | "CAUTION" | "HIGH RISK" | "INSUFFICIENT DATA" = factors.some((f) => f.level === "avoid")
    ? "HIGH RISK"
    : core.every((f) => f.level === "unknown")
      ? "INSUFFICIENT DATA"
      : factors.some((f) => f.level === "caution")
        ? "CAUTION"
        : "SAFE";
  return { overall, factors, window: w };
}

/** Heuristic confidence with visible reasons. */
export function confidence(opts: { missing: string[]; stale: string[]; horizonH: number; conflicts: string[] }) {
  const reasons: string[] = [];
  let score = 3;
  if (opts.missing.length) { score--; reasons.push(`Missing: ${opts.missing.join(", ")}`); }
  if (opts.stale.length) { score--; reasons.push(`Stale: ${opts.stale.join(", ")}`); }
  if (opts.horizonH > 48) { score--; reasons.push(`Forecast horizon ${Math.round(opts.horizonH)} h (skill drops after ~48 h)`); }
  if (opts.conflicts.length) { score--; reasons.push(...opts.conflicts); }
  if (!reasons.length) reasons.push("All core variables present, sources fresh, horizon < 48 h, no source disagreement");
  return { level: (score >= 3 ? "High" : score === 2 ? "Medium" : "Low") as "High" | "Medium" | "Low", reasons, method: "heuristic (not a statistical probability)" };
}

/** Hour-by-hour level for timelines and departure-window search. */
export function hourlyLevels(marine: Hourly | undefined, weather: Hourly | undefined, w: Window) {
  if (!marine && !weather) return [];
  const times = (weather ?? marine)!.time;
  return windowIdx(times, w).map((i) => {
    const t = times[i]!;
    const mIdx = marine ? marine.time.indexOf(t) : -1;
    const g = (s: Hourly | undefined, k: string, j: number) => (j >= 0 ? ((s?.[k] as Array<number | null>)?.[j] ?? null) : null);
    const wave = g(marine, "wave_height", mIdx);
    const wind = g(weather, "wind_speed_10m", i);
    const gust = g(weather, "wind_gusts_10m", i);
    const code = g(weather, "weather_code", i);
    const T = THRESHOLDS;
    const levels = [lvl(wave, T.wave.caution, T.wave.avoid), lvl(wind, T.wind.caution, T.wind.avoid), lvl(gust, T.gust.caution, T.gust.avoid), code === null ? "unknown" : code >= 95 ? "caution" : "ok"];
    const level: Level = levels.includes("avoid") ? "avoid" : levels.includes("caution") ? "caution" : levels.every((l) => l === "unknown") ? "unknown" : "ok";
    return { time: `${t}+05:30`, wave, wind, gust, weatherCode: code, level };
  });
}

/** Best contiguous run of `ok` hours (≥ minH). */
export function bestWindow(hours: ReturnType<typeof hourlyLevels>, minH = 3) {
  let best: { from: string; to: string; hours: number } | null = null;
  let start = -1;
  hours.forEach((h, i) => {
    if (h.level === "ok") { if (start < 0) start = i; }
    const end = h.level !== "ok" || i === hours.length - 1;
    if (end && start >= 0) {
      const last = h.level === "ok" ? i : i - 1;
      const len = last - start + 1;
      if (len >= minH && (!best || len > best.hours)) best = { from: hours[start]!.time, to: hours[last]!.time, hours: len };
      start = -1;
    }
  });
  return best as { from: string; to: string; hours: number } | null;
}
