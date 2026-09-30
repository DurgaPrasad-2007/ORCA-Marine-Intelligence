// Outbound HTTP for all ORCA data adapters: host allowlist (SSRF guard), timeout,
// one retry, per-host circuit breaker, TTL cache with in-flight de-duplication.

const ALLOWED_HOSTS = new Set([
  "marine-api.open-meteo.com",
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "coastwatch.noaa.gov",
  "coastwatch.pfeg.noaa.gov",
  "incois.gov.in",
  "sachet.ndma.gov.in",
  "www.gdacs.org",
  "geo.vliz.be",
  "data-gis.unep-wcmc.org",
  "nominatim.openstreetmap.org",
]);

// Failure drill: ORCA_BLOCK_HOSTS=sachet.ndma.gov.in makes those hosts fail exactly as if they were down,
// so graceful degradation can be shown live. Unset in normal operation.
const BLOCKED = new Set((process.env["ORCA_BLOCK_HOSTS"] ?? "").split(",").map((h) => h.trim()).filter(Boolean));

type Circuit = { failures: number; openUntil: number; lastError?: string; lastOk?: number };
const circuits = new Map<string, Circuit>();

export function circuitStatus() {
  return [...ALLOWED_HOSTS].map((host) => {
    const c = circuits.get(host);
    return {
      host,
      state: c && c.openUntil > Date.now() ? "open" : "closed",
      failures: c?.failures ?? 0,
      lastError: c?.lastError ?? null,
      lastOk: c?.lastOk ? new Date(c.lastOk).toISOString() : null,
    };
  });
}

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { host } = new URL(url);
  if (!ALLOWED_HOSTS.has(host)) throw new Error(`Host not allowlisted: ${host}`);
  if (BLOCKED.has(host)) throw new Error(`${host} is unreachable (failure drill: ORCA_BLOCK_HOSTS)`);
  const c = circuits.get(host) ?? { failures: 0, openUntil: 0 };
  circuits.set(host, c);
  if (c.openUntil > Date.now()) throw new Error(`Circuit open for ${host}: ${c.lastError}`);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 400 * attempt)); // backoff: 400 ms, 800 ms
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), init.timeoutMs ?? 15_000);
    try {
      const res = await fetch(url, { ...init, signal: ctl.signal });
      if (!res.ok) throw new Error(`${host} HTTP ${res.status}`);
      const body = await res.text();
      c.failures = 0;
      c.lastOk = Date.now();
      return body;
    } catch (err) {
      // undici's "fetch failed" hides the real reason in err.cause (ECONNRESET, timeout, DNS…)
      const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
      lastErr = err instanceof Error ? new Error(`${host}: ${err.message}${cause}`) : err;
      if (err instanceof Error && /HTTP 4\d\d/.test(err.message) && !/HTTP 429/.test(err.message)) break; // client errors won't improve on retry, rate limits (429) may
      if (err instanceof Error && /HTTP 429/.test(err.message)) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  c.lastError = lastErr instanceof Error ? lastErr.message : String(lastErr);
  // A 4xx on one path (say a blocked sub-endpoint) says nothing about the host's health: it must not take the whole host down.
  if (!/HTTP 4\d\d/.test(c.lastError) || /HTTP 429/.test(c.lastError)) {
    c.failures++;
    if (c.failures >= 3) c.openUntil = Date.now() + 60_000;
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export const fetchJson = async <T>(url: string, init?: RequestInit & { timeoutMs?: number }) =>
  JSON.parse(await fetchText(url, init)) as T;

// ponytail: in-process cache, move to Redis when running more than one API instance
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}
