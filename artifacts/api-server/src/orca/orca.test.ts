// Deterministic tests: no network, no model. Run with `pnpm --filter @workspace/api-server test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Content } from "@google/genai";
import { checkGrounding, indicScript, languageMismatch, trimTurns } from "./agent";
import { crossedBoundary, destination, haversineKm, nearestBoundaries, nearestOnLine, pointInPolygon, type Boundary, type LonLat } from "./geo";
import { assess, bestWindow, confidence, hourlyLevels, THRESHOLDS } from "./risk";
import { astar } from "./route";
import { parseCapRss, type Hourly } from "./sources";

const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
const win = (from: string, to: string) => ({ start: new Date(from), end: new Date(to), label: "t" });
const hours = (n: number) => Array.from({ length: n }, (_, i) => `2026-10-01T${String(i).padStart(2, "0")}:00`);

test("geo: haversine, polygon, line distance", () => {
  near(haversineKm([80.27, 13.08], [79.86, 6.93]), 692, 8); // Chennai to Colombo
  const sq: LonLat[] = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
  assert.equal(pointInPolygon([1, 1], sq), true);
  assert.equal(pointInPolygon([3, 1], sq), false);
  near(nearestOnLine([0, 1], [[1, 0], [1, 2]]).km, 111.2 * Math.cos(Math.PI / 180 * 1) , 1);
});

test("geo: boundaries are found and crossing is detected", () => {
  const b: Boundary[] = [{ name: "Test line", type: "Treaty", agreement: null, lines: [[[80, 9], [80, 10]]] }];
  assert.equal(nearestBoundaries([79.9, 9.5], b, 30)[0]?.name, "Test line");
  assert.equal(nearestBoundaries([78, 9.5], b, 30).length, 0);
  assert.equal(crossedBoundary([79.9, 9.5], [80.1, 9.5], b)?.name, "Test line");
  assert.equal(crossedBoundary([79.9, 9.5], [79.95, 9.6], b), null);
});

test("risk: thresholds, basis and missing data", () => {
  const marine: Hourly = { time: hours(6), wave_height: [0.5, 0.6, 1.4, 2.7, 0.7, 0.6] };
  const weather: Hourly = { time: hours(6), wind_speed_10m: [10, 12, 14, 16, 12, 10], wind_gusts_10m: [20, 22, 24, 26, 22, 20], weather_code: [1, 1, 1, 1, 1, 1], precipitation_probability: [10, 10, 10, 10, 10, 10], visibility: [9000, 9000, 9000, 9000, 9000, 9000] };
  const calm = assess(marine, weather, win("2026-10-01T00:00:00+05:30", "2026-10-01T02:00:00+05:30"), {});
  assert.equal(calm.overall, "SAFE");
  const rough = assess(marine, weather, win("2026-10-01T00:00:00+05:30", "2026-10-01T05:00:00+05:30"), {});
  assert.equal(rough.overall, "HIGH RISK"); // 2.7 m >= 2.5 m
  assert.equal(rough.factors.find((f) => f.key === "wave")?.basis, THRESHOLDS.wave.basis);
  const none = assess(undefined, undefined, win("2026-10-01T00:00:00+05:30", "2026-10-01T05:00:00+05:30"), {});
  assert.equal(none.overall, "INSUFFICIENT DATA");
  const alert = assess(marine, weather, win("2026-10-01T00:00:00+05:30", "2026-10-01T02:00:00+05:30"), { officialAlerts: [{ title: "x" }] });
  assert.equal(alert.overall, "CAUTION"); // any nearby official alert raises caution
});

test("risk: best departure window and confidence", () => {
  const marine: Hourly = { time: hours(8), wave_height: [0.5, 0.5, 1.6, 0.5, 0.5, 0.5, 0.5, 2.8] };
  const weather: Hourly = { time: hours(8), wind_speed_10m: Array(8).fill(10), wind_gusts_10m: Array(8).fill(20), weather_code: Array(8).fill(1) };
  const h = hourlyLevels(marine, weather, win("2026-10-01T00:00:00+05:30", "2026-10-01T08:00:00+05:30"));
  const best = bestWindow(h);
  assert.equal(best?.hours, 4); // hours 3..6
  assert.equal(confidence({ missing: [], stale: [], horizonH: 10, conflicts: [] }).level, "High");
  assert.equal(confidence({ missing: ["alerts"], stale: ["sst"], horizonH: 60, conflicts: [] }).level, "Low");
});

test("grounding: numbers must come from tool results", () => {
  const corpus = ['{"wave_m":0.7,"km":26.3,"issued":"2026-09-29"}', "now 2026-09-30T07:00:00+05:30"];
  assert.deepEqual(checkGrounding("Waves 0.7 m, PFZ 26.3 km away, issued 2026-09-29.", corpus).ungrounded, []);
  const bad = checkGrounding("Waves 0.7 m but gusts reach 48 km/h and the PFZ is 12.4 km away.", corpus);
  assert.deepEqual(bad.ungrounded.sort(), ["12.4", "48"].sort());
  assert.equal(checkGrounding("No numbers here.", corpus).checked, 0);
  // thousands separators are one number, not two
  assert.deepEqual(checkGrounding("Cyclone is 4,974 km away.", ["{\"km\":4974}"]).ungrounded, []);
  assert.deepEqual(checkGrounding("Cyclone is 4,975 km away.", ["{\"km\":4974}"]).ungrounded, ["4975"]);
  // large round figures may round a real value; small numbers and non-matching rounds may not
  assert.deepEqual(checkGrounding("Cyclone is about 4,900 km away.", ["{\"km\":4974}"]).ungrounded, []);
  assert.deepEqual(checkGrounding("Cyclone is about 3,000 km away.", ["{\"km\":4974}"]).ungrounded, ["3000"]);
  assert.deepEqual(checkGrounding("Gusts near 50 km/h.", ["{\"gust\":48}"]).ungrounded, ["50"]);
});

test("cap: RSS parsing keeps ids, senders and times", () => {
  const xml = `<rss><channel><item><title>Heavy rain at Puri &amp; Khurda</title><category>Met</category><link>https://x/FetchXMLFile?identifier=123</link><author>controlroom@ndma.gov.in (IMD Bhubaneswar)</author><guid isPermaLink="false">123</guid><pubDate>Tue, 29 Sep 2026 23:23:18 GMT</pubDate></item></channel></rss>`;
  const [a] = parseCapRss(xml);
  assert.equal(a?.id, "123");
  assert.equal(a?.sender, "IMD Bhubaneswar");
  assert.equal(a?.title, "Heavy rain at Puri & Khurda");
  assert.equal(a?.published, "2026-09-29T23:23:18.000Z");
});

test("memory: trimming cuts only at plain user turns so tool pairs survive", () => {
  const user = (t: string): Content => ({ role: "user", parts: [{ text: t }] });
  const call: Content = { role: "model", parts: [{ functionCall: { name: "x", args: {} } }] };
  const res: Content = { role: "user", parts: [{ functionResponse: { name: "x", response: {} } }] };
  const c = [user("1"), call, res, user("2"), call, res, user("3"), user("4"), user("5"), call, res];
  const t = trimTurns(c);
  assert.equal(t[0]?.parts?.[0]?.text, "2");
  assert.ok(t.every((m, i) => !(m.parts?.[0]?.functionResponse) || t[i - 1]?.parts?.[0]?.functionCall));
});

test("route: safer profile avoids rough cells; boundaries are hard constraints", () => {
  const n = 5;
  const nodes = Array.from({ length: n * n }, (_, k) => {
    const i = k % n, j = Math.floor(k / n);
    return { i, j, lonlat: [80 + i * 0.1, 10 + j * 0.1] as LonLat, sea: true, wave: j === 2 && i > 0 && i < 4 ? 3 : 0.5, wind: 10 };
  });
  const grid = { n, nodes, evidence: [], bbox: [80, 10, 80.4, 10.4] as const };
  const shortest = astar(grid, [80, 10.2], [80.4, 10.2], "shortest", []);
  const safer = astar(grid, [80, 10.2], [80.4, 10.2], "safer", []);
  assert.ok(shortest.ok && safer.ok);
  if (shortest.ok && safer.ok) { assert.ok((safer.maxWave ?? 9) < (shortest.maxWave ?? 0)); assert.ok(safer.distanceKm >= shortest.distanceKm); }
  const wall: Boundary[] = [{ name: "Wall", type: "Treaty", agreement: null, lines: [[[80.2, 9.9], [80.2, 10.5]]] }];
  const blocked = astar(grid, [80, 10.2], [80.4, 10.2], "shortest", wall);
  assert.equal(blocked.ok, false);
});

test("geo: destination is the inverse of distance and bearing", () => {
  const p: LonLat = [80.3, 13.1];
  for (const [b, km] of [[0, 50], [90, 120], [225, 300]] as const) near(haversineKm(p, destination(p, b, km)), km, 0.5);
  near(destination(p, 90, 100)[1], 13.1, 0.01); // due east keeps latitude
});

test("language guard: Indian-script questions must get answers in that script", () => {
  assert.equal(indicScript("நாளை காலை ராமேஸ்வரம் அருகே"), "Tamil");
  assert.equal(indicScript("Is it safe near Digha?"), null);
  assert.equal(languageMismatch("நாளை காலை ராமேஸ்வரம் அருகே கடலுக்குச் செல்வது பாதுகாப்பானதா?", "Wave height is 0.6 m and wind is 18 km/h."), true);
  assert.equal(languageMismatch("நாளை காலை ராமேஸ்வரம் அருகே கடலுக்குச் செல்வது பாதுகாப்பானதா?", "அலை உயரம் 0.6 மீட்டர், காற்று 18 கி.மீ/மணி. IMD எச்சரிக்கை இல்லை."), false);
  assert.equal(languageMismatch("Is it safe near Digha?", "Lower risk."), false); // English questions are never rewritten
  assert.equal(languageMismatch("कल सुबह चेन्नई के पास", "कल सुबह जोखिम मध्यम है और लहरें 0.5 मीटर हैं।"), false);
});
