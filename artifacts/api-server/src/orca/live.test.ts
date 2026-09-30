// Live-data tests: every adapter against the real service. Run with `pnpm --filter @workspace/api-server test:live`.
// Assertions check shape and sanity, never exact values, because the ocean changes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { alertsNear, boundaries, capAlerts, cyclonesNear, eoGrid, eoPointSeries, geocode, marineForecast, nearestCoast, pfzFeatures, protectedAreas, protectedNear, reverseName, weatherForecast } from "./sources";
import { newRun, safetyAt, window } from "./tools";

const CHENNAI: [number, number] = [80.3, 13.1];

test("geocode: Digha resolves to the coastal one first, not the Bihar town", async () => {
  const g = await geocode("Digha");
  assert.equal(g.matches[0]?.coastal, true);
  assert.equal(g.matches[0]?.state, "West Bengal");
  assert.ok(g.matches.length > 0);
  const m = g.matches[0]!;
  assert.ok(m.lonlat[1] > 21 && m.lonlat[1] < 22.5 && m.lonlat[0] > 87 && m.lonlat[0] < 88.5, `unexpected ${m.lonlat}`);
});

test("forecast: marine and weather return hourly arrays", async () => {
  const [m, w] = await Promise.all([marineForecast([CHENNAI]), weatherForecast([CHENNAI])]);
  assert.ok((m.series[0]?.time.length ?? 0) > 24);
  assert.ok((w.series[0]?.time.length ?? 0) > 24);
  assert.equal(m.evidence.status, "live");
});

test("INCOIS PFZ: advisory is recent and has lines", { timeout: 180_000 }, async () => {
  const { features, evidence } = await pfzFeatures();
  assert.ok(features.length > 20, `only ${features.length} PFZ lines`);
  assert.ok(features.every((f) => f.coordinates.length > 0));
  assert.notEqual(evidence.status, "unavailable");
  const ageDays = (Date.now() - Date.parse(evidence.observedAt ?? "1970-01-01")) / 864e5;
  assert.ok(ageDays < 14, `PFZ advisory is ${ageDays.toFixed(0)} days old`);
});

test("NDMA CAP: alerts parse and polygons resolve for some", { timeout: 120_000 }, async () => {
  const { items } = await capAlerts();
  assert.ok(items.length > 0 && items.every((a) => a.id && a.title));
  const r = await alertsNear(items, [77.6, 12.97], 500, 72);
  assert.ok(r.considered > 0);
});

test("NOAA ERDDAP: satellite SST and chlorophyll near Chennai", { timeout: 120_000 }, async () => {
  const sst = await eoPointSeries("sst", CHENNAI, "last-5:last");
  assert.ok(sst.rows.length > 0 && sst.rows.every((r) => r.value > 15 && r.value < 40));
  const grid = await eoGrid("chl", [79.5, 12.5, 81, 14], 2);
  assert.ok(grid.cells.length > 0);
});

test("GDACS, Marine Regions and Nominatim respond", { timeout: 120_000 }, async () => {
  const c = await cyclonesNear(CHENNAI);
  assert.ok(Array.isArray(c.events));
  const b = await boundaries();
  assert.ok(b.lines.some((l) => l.type === "200 NM"));
  assert.ok(b.lines.length > 3);
  const name = await reverseName([80.27, 13.08]);
  assert.ok(name === null || typeof name === "string");
});

test("safetyAt: full deterministic assessment from live data", { timeout: 120_000 }, async () => {
  const r = newRun();
  const s = await safetyAt(r, CHENNAI, window(new Date().toISOString(), new Date(Date.now() + 12 * 3.6e6).toISOString()));
  assert.ok(["SAFE", "CAUTION", "HIGH RISK", "INSUFFICIENT DATA"].includes(s.risk.overall));
  assert.ok(s.risk.factors.length >= 6);
  assert.ok(r.evidence.size >= 4);
});

test("WDPA: Gulf of Mannar is found, with real polygons", { timeout: 120_000 }, async () => {
  const { areas } = await protectedAreas();
  assert.ok(areas.length > 10, `only ${areas.length} areas`);
  const hits = protectedNear([79.1, 9.1], areas, 50);
  assert.ok(hits.some((h) => /Gulf of Mannar/i.test(h.name)), "Gulf of Mannar not near 79.1E 9.1N");
  assert.ok(hits.find((h) => /Gulf of Mannar/i.test(h.name))!.boundaryPublished);
});

test("nearest coast: a point off Andhra Pradesh finds land within a plausible distance", { timeout: 120_000 }, async () => {
  const c = await nearestCoast([80.9, 15.4], 200);
  assert.equal(c.onLand, false);
  assert.ok(c.coasts.length > 0, "no coast found");
  const first = c.coasts[0]!;
  assert.ok(first.distanceKm >= 5 && first.distanceKm <= 80, `implausible ${first.distanceKm} km`);
  assert.ok(first.seaEdge[0] > 79 && first.seaEdge[0] < 82);
});
