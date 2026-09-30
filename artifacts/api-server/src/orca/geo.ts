// Deterministic geospatial primitives. The LLM never does this math.

export type LonLat = [number, number];
const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bearingDeg([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export const compass = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8]!;

export function pointInPolygon([x, y]: LonLat, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Nearest point on a polyline. Local equirectangular projection: accurate to <1% at the
// distances we care about (<300 km); the reported distance is then re-measured with haversine.
export function nearestOnLine(p: LonLat, line: LonLat[]): { point: LonLat; km: number } {
  const k = Math.cos(rad(p[1]));
  let best = { point: line[0]!, km: Infinity };
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i]!;
    const [bx, by] = line[i + 1]!;
    const dx = (bx - ax) * k;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (((p[0] - ax) * k) * dx + (p[1] - ay) * dy) / len2));
    const q: LonLat = [ax + t * (bx - ax), ay + t * (by - ay)];
    const km = haversineKm(p, q);
    if (km < best.km) best = { point: q, km };
  }
  return best;
}

export function segmentsIntersect(a: LonLat, b: LonLat, c: LonLat, d: LonLat): boolean {
  const o = (p: LonLat, q: LonLat, r: LonLat) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// International maritime boundaries come from Marine Regions (VLIZ); see sources.ts#boundaries.
export type Boundary = { name: string; type: string; agreement: string | null; lines: LonLat[][] };

export function nearestBoundaries(p: LonLat, bs: Boundary[], withinKm: number) {
  return bs
    .map((b) => {
      const best = b.lines.map((l) => nearestOnLine(p, l)).sort((x, y) => x.km - y.km)[0]!;
      return { name: b.name, type: b.type, agreement: b.agreement, km: Math.round(best.km * 10) / 10, dir: compass(bearingDeg(p, best.point)), nearest: best.point };
    })
    .filter((x) => x.km <= withinKm)
    .sort((x, y) => x.km - y.km);
}

/** The boundary crossed by a straight segment, if any (hard routing constraint). */
export function crossedBoundary(a: LonLat, b: LonLat, bs: Boundary[]): Boundary | null {
  for (const bd of bs)
    for (const l of bd.lines)
      for (let i = 0; i < l.length - 1; i++) if (segmentsIntersect(a, b, l[i]!, l[i + 1]!)) return bd;
  return null;
}

/** Inside-test and nearest distance from a point to polygons (outer ring + holes). Distance is 0 when inside. */
export function nearestPolygonKm(p: LonLat, polys: LonLat[][][]): { inside: boolean; km: number } {
  let inside = false;
  let best = Infinity;
  for (const poly of polys) {
    if (pointInPolygon(p, poly[0]!) && !poly.slice(1).some((h) => pointInPolygon(p, h))) inside = true;
    for (const ring of poly) if (ring.length > 1) best = Math.min(best, nearestOnLine(p, ring).km);
  }
  return { inside, km: inside ? 0 : Math.round(best * 10) / 10 };
}

/** Point reached from `p` after `km` on an initial bearing (great circle). */
export function destination([lon, lat]: LonLat, bearing: number, km: number): LonLat {
  const d = km / R, b = rad(bearing), la = rad(lat), lo = rad(lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [(lo2 * 180) / Math.PI, (la2 * 180) / Math.PI];
}
