import { Router, type IRouter, type Response } from "express";
import type { Content } from "@google/genai";
import { z } from "zod/v4";
import { requireUser } from "../auth";
import { all, one, run, type Location } from "../db";
import { logger } from "../lib/logger";
import { ask, LlmUnavailable, MODEL, trimTurns } from "../orca/agent";
import { bearingDeg, compass, nearestBoundaries, nearestOnLine, type LonLat } from "../orca/geo";
import { sourceHealth } from "../orca/health";
import { alertRings, alertsNear, boundaries, capAlerts, geocode, pfzFeatures, protectedAreas, reverseName } from "../orca/sources";
import { THRESHOLDS } from "../orca/risk";
import { newRun, safetyAt, window } from "../orca/tools";

const router: IRouter = Router();
const num = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
const validPoint = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= 0 && lat <= 40 && lon >= 55 && lon <= 100;
const fail = (res: Response, err: unknown) => {
  logger.error({ err }, "request failed");
  res.status(502).json({ error: err instanceof Error ? err.message : "Upstream source failed" });
};
const next12h = () => window(new Date().toISOString(), new Date(Date.now() + 12 * 3.6e6).toISOString());

// ---------------------------------------------------------------- public map layers (live, no login needed)
router.get("/layers/pfz", async (_req, res) => {
  try {
    const { features, evidence } = await pfzFeatures();
    res.json({ evidence, geojson: { type: "FeatureCollection", features: features.map((f) => ({ type: "Feature", properties: { id: f.id, sector: f.sector, issued: f.issued }, geometry: { type: "MultiLineString", coordinates: f.coordinates } })) } });
  } catch (err) { fail(res, err); }
});
router.get("/layers/boundaries", async (_req, res) => {
  try {
    const { lines, evidence } = await boundaries();
    res.json({ evidence, geojson: { type: "FeatureCollection", features: lines.map((b) => ({ type: "Feature", properties: { name: b.name, type: b.type }, geometry: { type: "MultiLineString", coordinates: b.lines } })) } });
  } catch (err) { fail(res, err); }
});
router.get("/layers/protected", async (_req, res) => {
  try {
    const { areas, evidence } = await protectedAreas();
    res.json({ evidence, geojson: { type: "FeatureCollection", features: areas.flatMap((a): unknown[] => (a.point ? [{ type: "Feature", properties: { name: a.name }, geometry: { type: "Point", coordinates: a.point } }] : a.polygons.map((poly) => ({ type: "Feature", properties: { name: a.name, designation: a.designation }, geometry: { type: "Polygon", coordinates: poly } })))) } });
  } catch (err) { fail(res, err); }
});
router.get("/layers/alerts", async (_req, res) => {
  try {
    const cap = await capAlerts();
    const recent = cap.items.filter((a) => Date.now() - Date.parse(a.published) < 24 * 3.6e6 && a.sender !== "CWC");
    const feats = (await Promise.all(recent.map(async (a) => (await alertRings(a.id))?.map((ring) => ({ type: "Feature", properties: { title: a.title, sender: a.sender, published: a.published }, geometry: { type: "Polygon", coordinates: [ring] } })) ?? []))).flat();
    res.json({ evidence: cap.evidence, geojson: { type: "FeatureCollection", features: feats } });
  } catch (err) { fail(res, err); }
});
router.get("/thresholds", (_req, res) => {
  const T = THRESHOLDS;
  res.json({ rows: [
    { factor: "Significant wave height", caution: `≥ ${T.wave.caution} m`, avoid: `≥ ${T.wave.avoid} m`, basis: T.wave.basis },
    { factor: "Sustained wind", caution: `≥ ${T.wind.caution} km/h`, avoid: `≥ ${T.wind.avoid} km/h`, basis: T.wind.basis },
    { factor: "Wind gusts", caution: `≥ ${T.gust.caution} km/h`, avoid: `≥ ${T.gust.avoid} km/h`, basis: T.gust.basis },
    { factor: "Thunderstorm (forecast weather code 95–99)", caution: "1 h in window", avoid: "≥ 2 h in window", basis: "demo threshold (proxy for lightning)" },
    { factor: "Rain probability", caution: `≥ ${T.rainProb.caution}%`, avoid: "never alone", basis: "demo threshold" },
    { factor: "Visibility", caution: "≤ 2 km", avoid: "never alone", basis: "demo threshold" },
    { factor: "Tropical cyclone distance (GDACS)", caution: `≤ ${T.cycloneKm.caution} km`, avoid: `≤ ${T.cycloneKm.avoid} km`, basis: "demo threshold" },
    { factor: "Official CAP alert within 25 km", caution: "any alert (read its text)", avoid: "the agent judges from the text", basis: "official alert" },
    { factor: "International boundary distance", caution: "< 5 km", avoid: "inside", basis: "demo threshold" },
    { factor: "Protected area (WDPA, partial India coverage)", caution: "inside or < 5 km", avoid: "never alone", basis: "demo threshold" },
  ] });
});
router.get("/sources", async (_req, res) => res.json({ sources: await sourceHealth(), checkedAt: new Date().toISOString() }));

router.use(requireUser);

// ---------------------------------------------------------------- alerts feed
router.get("/alerts", async (req, res) => {
  try {
    const cap = await capAlerts();
    const hours = Math.min(72, Math.max(1, num(req.query["hours"]) || 36));
    const recent = cap.items.filter((a) => Date.now() - Date.parse(a.published) < hours * 3.6e6 && a.sender !== "CWC").sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
    const lat = num(req.query["lat"]), lon = num(req.query["lon"]);
    if (validPoint(lat, lon)) {
      const near = await alertsNear(cap.items, [lon, lat], Math.min(200, num(req.query["radius_km"]) || 25), hours);
      return void res.json({ evidence: cap.evidence, alerts: near.matches.map(({ rings: _r, ...a }) => a), considered: near.considered, unresolved: near.unresolved });
    }
    res.json({ evidence: cap.evidence, alerts: recent.slice(0, 80) });
  } catch (err) { fail(res, err); }
});

// ---------------------------------------------------------------- point briefing for the map (deterministic, no model)
router.get("/point", async (req, res) => {
  const lat = num(req.query["lat"]), lon = num(req.query["lon"]);
  if (!validPoint(lat, lon)) return void res.status(400).json({ error: "lat/lon must be within the Indian Ocean region (lat 0–40, lon 55–100)." });
  const p: LonLat = [lon, lat];
  try {
    const r = newRun();
    const [s, pfz, name] = await Promise.all([safetyAt(r, p, next12h()), pfzFeatures().catch(() => null), reverseName(p)]);
    const zones = pfz ? pfz.features.map((f) => { const b = f.coordinates.map((l) => nearestOnLine(p, l)).sort((x, y) => x.km - y.km)[0]!; return { id: f.id, issued: f.issued, km: Math.round(b.km * 10) / 10, dir: compass(bearingDeg(p, b.point)), nearest: b.point }; }).sort((a, b) => a.km - b.km).slice(0, 3) : null;
    res.json({ name, lat, lon, overall: s.risk.overall, factors: s.risk.factors, best: s.best, confidence: s.conf, missing: s.missing, alerts: s.alerts?.matches.map(({ rings: _r, ...a }) => a) ?? null, boundary: s.nearBoundary ? { name: s.nearBoundary.name, km: s.nearBoundary.km, dir: s.nearBoundary.dir } : null, protectedArea: s.nearProtected, pfz: zones, pfzIssued: pfz?.evidence.observedAt ?? null, evidence: [...r.evidence.values()] });
  } catch (err) { fail(res, err); }
});

// ---------------------------------------------------------------- saved locations + watchlist
const locSchema = z.object({ name: z.string().trim().min(2).max(80), lat: z.number().min(0).max(40), lon: z.number().min(55).max(100), kind: z.enum(["harbour", "fishing ground", "home", "other"]).default("harbour") });
router.get("/locations", (req, res) => res.json({ locations: all<Location>("SELECT id, name, lat, lon, kind FROM locations WHERE user_id = ? ORDER BY id", req.user!.id) }));
router.post("/locations", (req, res) => {
  const p = locSchema.safeParse(req.body);
  if (!p.success) return void res.status(400).json({ error: z.prettifyError(p.error) });
  if ((one<{ n: number }>("SELECT COUNT(*) AS n FROM locations WHERE user_id = ?", req.user!.id)?.n ?? 0) >= 10) return void res.status(400).json({ error: "You can save up to 10 locations." });
  const r = run("INSERT INTO locations (user_id, name, lat, lon, kind) VALUES (?, ?, ?, ?, ?)", req.user!.id, p.data.name, p.data.lat, p.data.lon, p.data.kind);
  res.status(201).json({ location: { id: Number(r.lastInsertRowid), ...p.data } });
});
router.delete("/locations/:id", (req, res) => { run("DELETE FROM locations WHERE id = ? AND user_id = ?", Number(req.params["id"]), req.user!.id); res.json({ ok: true }); });
router.get("/geocode", async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (q.length < 2) return void res.json({ matches: [] });
  try { res.json({ matches: (await geocode(q)).matches.map((m) => ({ name: m.name, admin: m.admin, coastal: m.coastal, lat: m.lonlat[1], lon: m.lonlat[0] })) }); } catch (err) { fail(res, err); }
});

/** Live status of each saved location: same deterministic screening the agent uses, no model call. */
router.get("/watch", async (req, res) => {
  const locs = all<Location>("SELECT id, name, lat, lon, kind FROM locations WHERE user_id = ? ORDER BY id", req.user!.id);
  const pfz = await pfzFeatures().catch(() => null);
  const items = await Promise.all(locs.map(async (l) => {
    const p: LonLat = [l.lon, l.lat];
    try {
      const s = await safetyAt(newRun(), p, next12h());
      const zone = pfz ? pfz.features.flatMap((f) => f.coordinates.map((c) => nearestOnLine(p, c))).sort((a, b) => a.km - b.km)[0] : undefined;
      const f = (k: string) => s.risk.factors.find((x) => x.key === k)?.value ?? null;
      return { ...l, ok: true, overall: s.risk.overall, wave: f("wave"), wind: f("wind"), gust: f("gust"), alerts: s.alerts?.matches.map(({ rings: _r, ...a }) => a) ?? [], alertsChecked: s.alerts !== null, best: s.best, confidence: s.conf.level, missing: s.missing, nearestPfzKm: zone ? Math.round(zone.km) : null, boundary: s.nearBoundary ? { name: s.nearBoundary.name, km: s.nearBoundary.km } : null, protectedArea: s.nearProtected };
    } catch (err) {
      return { ...l, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }));
  res.json({ items, checkedAt: new Date().toISOString(), pfzIssued: pfz?.evidence.observedAt ?? null });
});

// ---------------------------------------------------------------- overview
router.get("/overview", async (req, res) => {
  const [pfz, cap, health] = await Promise.allSettled([pfzFeatures(), capAlerts(), sourceHealth()]);
  const alerts = cap.status === "fulfilled" ? cap.value.items.filter((a) => Date.now() - Date.parse(a.published) < 24 * 3.6e6 && a.sender !== "CWC").sort((a, b) => Date.parse(b.published) - Date.parse(a.published)) : null;
  res.json({
    pfz: pfz.status === "fulfilled" ? { issued: pfz.value.evidence.observedAt, status: pfz.value.evidence.status, lines: pfz.value.features.length } : null,
    alerts: alerts ? { count24h: alerts.length, latest: alerts.slice(0, 5) } : null,
    sources: health.status === "fulfilled" ? { ok: health.value.filter((h) => h.ok).length, total: health.value.length, down: health.value.filter((h) => !h.ok).map((h) => h.name) } : null,
    locations: one<{ n: number }>("SELECT COUNT(*) AS n FROM locations WHERE user_id = ?", req.user!.id)?.n ?? 0,
    conversations: all<{ id: number; title: string; updated_at: string }>("SELECT id, title, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 4", req.user!.id),
  });
});

// ---------------------------------------------------------------- conversations
router.get("/conversations", (req, res) => res.json({ conversations: all("SELECT id, title, created_at, updated_at, (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages FROM conversations c WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100", req.user!.id) }));
router.get("/conversations/:id", (req, res) => {
  const c = one<{ id: number; title: string }>("SELECT id, title FROM conversations WHERE id = ? AND user_id = ?", Number(req.params["id"]), req.user!.id);
  if (!c) return void res.status(404).json({ error: "Conversation not found" });
  const messages = all<{ role: string; text: string; answer: string | null; created_at: string }>("SELECT role, text, answer, created_at FROM messages WHERE conversation_id = ? ORDER BY id", c.id).map((m) => ({ ...m, answer: m.answer ? JSON.parse(m.answer) : null }));
  res.json({ ...c, messages });
});
router.delete("/conversations/:id", (req, res) => { run("DELETE FROM conversations WHERE id = ? AND user_id = ?", Number(req.params["id"]), req.user!.id); res.json({ ok: true }); });

// ---------------------------------------------------------------- chat (server-sent events)
const chatSchema = z.object({ conversationId: z.number().int().optional(), message: z.string().trim().min(1).max(1000), lonlat: z.tuple([z.number(), z.number()]).optional() });
const hits = new Map<number, number[]>();

router.post("/chat", async (req, res) => {
  const p = chatSchema.safeParse(req.body);
  if (!p.success) return void res.status(400).json({ error: z.prettifyError(p.error) });
  const uid = req.user!.id;
  const recent = (hits.get(uid) ?? []).filter((t) => Date.now() - t < 60_000);
  if (recent.length >= 12) return void res.status(429).json({ error: "Too many questions. Wait a minute and try again." });
  hits.set(uid, [...recent, Date.now()]);

  let convId = p.data.conversationId;
  let history: Content[] = [];
  if (convId !== undefined) {
    const c = one<{ state: string }>("SELECT state FROM conversations WHERE id = ? AND user_id = ?", convId, uid);
    if (!c) return void res.status(404).json({ error: "Conversation not found" });
    history = JSON.parse(c.state) as Content[];
  } else {
    convId = Number(run("INSERT INTO conversations (user_id, title) VALUES (?, ?)", uid, p.data.message.slice(0, 70)).lastInsertRowid);
  }
  run("INSERT INTO messages (conversation_id, role, text) VALUES (?, 'user', ?)", convId, p.data.message);

  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("conversation", { id: convId });
  try {
    const saved = all<Location>("SELECT id, name, lat, lon, kind FROM locations WHERE user_id = ? ORDER BY id", uid);
    const out = await ask({ message: p.data.message, history, lonlat: p.data.lonlat, saved, language: req.user!.language, emit: (s) => send("step", s) });
    const { history: newHistory, ...answer } = out;
    run("UPDATE conversations SET state = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(trimTurns(newHistory)), convId);
    run("INSERT INTO messages (conversation_id, role, text, answer) VALUES (?, 'orca', ?, ?)", convId, answer.text, JSON.stringify(answer));
    send("answer", answer);
  } catch (err) {
    const msg = err instanceof LlmUnavailable ? err.message : "ORCA hit an unexpected error while answering. Nothing was fabricated; please try again.";
    if (!(err instanceof LlmUnavailable)) logger.error({ err }, "chat failed");
    run("INSERT INTO messages (conversation_id, role, text) VALUES (?, 'error', ?)", convId, msg);
    send("error", { message: msg });
  } finally {
    res.end();
  }
});

router.get("/model", (_req, res) => res.json({ model: MODEL }));

export default router;
