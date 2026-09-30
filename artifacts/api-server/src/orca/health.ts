// Live health of every upstream source, measured by actually calling it (cached 60 s). Nothing here is assumed.
import { boundaries, capAlerts, cyclonesNear, eoGrid, geocode, marineForecast, pfzFeatures, protectedAreas, weatherForecast, type Evidence } from "./sources";
import { circuitStatus } from "./net";

type Probe = { id: string; name: string; provider: string; use: string; run: () => Promise<Evidence> };

const PROBES: Probe[] = [
  { id: "pfz", name: "Potential Fishing Zones", provider: "INCOIS", use: "Where satellite SST and chlorophyll indicate fish aggregation", run: async () => (await pfzFeatures()).evidence },
  { id: "cap", name: "Official alerts (CAP)", provider: "NDMA SACHET · IMD · INCOIS", use: "Warnings for cyclone, waves, thunderstorm", run: async () => (await capAlerts()).evidence },
  { id: "marine", name: "Ocean forecast", provider: "Open-Meteo Marine", use: "Waves, swell, current, sea level, SST", run: async () => (await marineForecast([[80.3, 13.1]])).evidence },
  { id: "weather", name: "Weather forecast", provider: "Open-Meteo Forecast", use: "Wind, gusts, rain, thunderstorm code", run: async () => (await weatherForecast([[80.3, 13.1]])).evidence },
  { id: "sst", name: "Sea-surface temperature", provider: "NOAA OISST via ERDDAP", use: "Satellite SST, about 2 days behind", run: async () => (await eoGrid("sst", [80, 13, 80.5, 13.5], 1)).evidence },
  { id: "chl", name: "Chlorophyll-a", provider: "NOAA VIIRS via ERDDAP", use: "Satellite ocean colour, about 2 days behind", run: async () => (await eoGrid("chl", [80, 13, 80.5, 13.5], 1)).evidence },
  { id: "cyclone", name: "Tropical cyclones", provider: "GDACS", use: "Active cyclone tracks", run: async () => (await cyclonesNear([80.3, 13.1])).evidence },
  { id: "boundaries", name: "Maritime boundaries", provider: "Marine Regions (VLIZ)", use: "International boundary and 200 NM limit", run: async () => (await boundaries()).evidence },
  { id: "wdpa", name: "Protected areas", provider: "UNEP-WCMC / IUCN WDPA", use: "National parks, biosphere reserves, Ramsar sites (partial India coverage)", run: async () => (await protectedAreas()).evidence },
  { id: "geocode", name: "Place search", provider: "GeoNames via Open-Meteo", use: "Turns place names into coordinates", run: async () => (await geocode("Chennai")).evidence },
];

export type SourceHealth = { id: string; name: string; provider: string; use: string; ok: boolean; status: string; ms: number; observedAt?: string; note?: string; error?: string; product?: string; url?: string };
let last: { at: number; value: Promise<SourceHealth[]> } | null = null;

export function sourceHealth(): Promise<SourceHealth[]> {
  if (last && Date.now() - last.at < 60_000) return last.value;
  const value = Promise.all(PROBES.map(async (p): Promise<SourceHealth> => {
    const t = Date.now();
    const base = { id: p.id, name: p.name, provider: p.provider, use: p.use };
    try {
      const e = await p.run();
      return { ...base, ok: true, status: e.status, ms: Date.now() - t, observedAt: e.observedAt ?? e.validFrom, note: e.note, product: e.product, url: e.url };
    } catch (err) {
      return { ...base, ok: false, status: "unavailable", ms: Date.now() - t, error: err instanceof Error ? err.message : String(err) };
    }
  }));
  last = { at: Date.now(), value };
  return value;
}

export { circuitStatus };
