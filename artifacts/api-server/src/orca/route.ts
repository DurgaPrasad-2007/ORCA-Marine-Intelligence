// Cost-surface route optimisation: A* on a regular grid sampled from live forecasts.
// Land mask = grid cells where the marine model has no wave value (the model's own coastline).
// Hard constraint: a route may not cross an international maritime boundary.
// ponytail: grid is <=14x14 (~5-15 km cells); a coarse cell can clip a headland. Use a
// proper coastline polygon + finer grid when this becomes an operational product.
import { crossedBoundary, haversineKm, type Boundary, type LonLat } from "./geo";
import { marineForecast, weatherForecast, type Hourly } from "./sources";
import { THRESHOLDS, windowIdx, type Window } from "./risk";

export type Profile = "shortest" | "balanced" | "safer";
export const WEIGHTS: Record<Profile, { wave: number; wind: number }> = {
  shortest: { wave: 0, wind: 0 },
  balanced: { wave: 1, wind: 1 },
  safer: { wave: 4, wind: 4 },
};

type Node = { i: number; j: number; lonlat: LonLat; sea: boolean; wave: number | null; wind: number | null };

const peak = (s: Hourly | undefined, k: string, idx: number[]) => {
  const v = idx.map((i) => (s?.[k] as Array<number | null> | undefined)?.[i]).filter((x): x is number => typeof x === "number");
  return v.length ? Math.max(...v) : null;
};

export async function buildGrid(a: LonLat, b: LonLat, w: Window) {
  const pad = 0.35;
  const W = Math.min(a[0], b[0]) - pad, E = Math.max(a[0], b[0]) + pad;
  const S = Math.min(a[1], b[1]) - pad, N = Math.max(a[1], b[1]) + pad;
  const n = 14;
  const pts: LonLat[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([W + ((E - W) * i) / (n - 1), S + ((N - S) * j) / (n - 1)]);
  const [m, wx] = await Promise.all([marineForecast(pts), weatherForecast(pts)]);
  const nodes: Node[] = pts.map((p, k) => {
    const ms = m.series[k];
    const ws = wx.series[k];
    const wave = ms ? peak(ms, "wave_height", windowIdx(ms.time, w)) : null;
    return { i: k % n, j: Math.floor(k / n), lonlat: p, sea: wave !== null, wave, wind: ws ? peak(ws, "wind_speed_10m", windowIdx(ws.time, w)) : null };
  });
  return { n, nodes, evidence: [m.evidence, wx.evidence], bbox: [W, S, E, N] as const };
}

const norm = (v: number | null, caution: number) => (v === null ? 0 : Math.max(0, v / caution - 0.5)); // 0 when calm, ~0.5 at caution, 1.5 at 2x caution

export function astar(grid: Awaited<ReturnType<typeof buildGrid>>, a: LonLat, b: LonLat, profile: Profile, bounds: Boundary[]) {
  const { n, nodes } = grid;
  const wt = WEIGHTS[profile];
  const sea = nodes.filter((x) => x.sea);
  if (!sea.length) return { ok: false as const, reason: "No sea cells in the forecast grid." };
  const snap = (p: LonLat) => sea.reduce((best, x) => (haversineKm(p, x.lonlat) < haversineKm(p, best.lonlat) ? x : best));
  const s = snap(a), t = snap(b);
  const id = (x: Node) => x.j * n + x.i;
  const cellCost = (x: Node) => 1 + wt.wave * norm(x.wave, THRESHOLDS.wave.caution) + wt.wind * norm(x.wind, THRESHOLDS.wind.caution);

  const g = new Map<number, number>([[id(s), 0]]);
  const prev = new Map<number, number>();
  const open = new Set<number>([id(s)]);
  const blockedBy = new Set<string>();
  while (open.size) {
    // ponytail: O(n) min-scan over <=196 nodes; use a binary heap if the grid grows
    let cur = -1, bestF = Infinity;
    for (const k of open) { const f = g.get(k)! + haversineKm(nodes[k]!.lonlat, t.lonlat); if (f < bestF) { bestF = f; cur = k; } }
    open.delete(cur);
    if (cur === id(t)) break;
    const c = nodes[cur]!;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = c.i + di, nj = c.j + dj;
      if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      const nb = nodes[nj * n + ni]!;
      if (!nb.sea) continue;
      const fence = crossedBoundary(c.lonlat, nb.lonlat, bounds);
      if (fence) { blockedBy.add(fence.name); continue; }
      const cost = g.get(cur)! + haversineKm(c.lonlat, nb.lonlat) * (cellCost(c) + cellCost(nb)) / 2;
      const k = id(nb);
      if (cost < (g.get(k) ?? Infinity)) { g.set(k, cost); prev.set(k, cur); open.add(k); }
    }
  }
  if (!g.has(id(t))) return { ok: false as const, reason: blockedBy.size ? `Destination unreachable without crossing: ${[...blockedBy].join(", ")}` : "Destination unreachable over sea cells." };

  const path: Node[] = [];
  for (let k: number | undefined = id(t); k !== undefined; k = prev.get(k)) path.unshift(nodes[k]!);
  const coords: LonLat[] = [a, ...path.map((x) => x.lonlat), b];
  let km = 0;
  for (let i = 1; i < coords.length; i++) km += haversineKm(coords[i - 1]!, coords[i]!);
  const waves = path.map((x) => x.wave).filter((v): v is number => v !== null);
  const winds = path.map((x) => x.wind).filter((v): v is number => v !== null);
  return {
    ok: true as const,
    profile,
    coordinates: coords,
    distanceKm: Math.round(km * 10) / 10,
    maxWave: waves.length ? Math.max(...waves) : null,
    maxWind: winds.length ? Math.max(...winds) : null,
    cost: Math.round(g.get(id(t))! * 10) / 10,
    avoided: [...blockedBy],
    profileSegments: path.map((x) => ({ lonlat: x.lonlat, wave: x.wave, wind: x.wind })),
  };
}

export function eta(distanceKm: number, speedKn = 8) {
  return Math.round((distanceKm / (speedKn * 1.852)) * 10) / 10; // hours
}
