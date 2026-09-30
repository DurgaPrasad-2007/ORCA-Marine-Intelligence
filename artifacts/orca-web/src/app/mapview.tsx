import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Compass, Layers } from 'lucide-react';
import { api, type LonLat } from '@/lib/api';

maplibregl.setWorkerUrl(workerUrl);

const TEAL = '#103d42';
const CORAL = '#e0715c';
const SEA = '#28786e';
const EMPTY = { type: 'FeatureCollection', features: [] } as const;
const INDIA: [number, number, number, number] = [67, 6, 93, 24];

// Esri ocean basemap + labels (keyless). The depiction of international boundaries may differ from the Survey of India's.
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    base: { type: 'raster', tileSize: 256, maxzoom: 10, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'], attribution: 'Esri, GEBCO, NOAA, National Geographic' },
    ref: { type: 'raster', tileSize: 256, maxzoom: 10, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}'] },
  },
  layers: [{ id: 'base', type: 'raster', source: 'base' }, { id: 'ref', type: 'raster', source: 'ref' }],
};

export type LayerToggles = { pfz: boolean; boundaries: boolean; alerts: boolean; protected: boolean };
type FC = { type: 'FeatureCollection'; features: unknown[] };
const cache: Record<string, Promise<FC>> = {};
const load = (key: string) => (cache[key] ??= api<{ geojson: FC }>(`/layers/${key}`).then((r) => r.geojson).catch((e) => { delete cache[key]; throw e; }));

/** Layers owned by the map: national context (fetched live) and per-answer agent output (passed in). */
function install(map: MLMap) {
  const src = (id: string) => map.addSource(id, { type: 'geojson', data: EMPTY as never });
  ['pfzAll', 'boundaries', 'alertsAll', 'protectedAll', 'a-protected', 'a-ports', 'a-pfz', 'a-alerts', 'a-geofence', 'a-routes', 'a-hotspots', 'a-location', 'pick'].forEach(src);
  map.addLayer({ id: 'protectedAll-fill', type: 'fill', source: 'protectedAll', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': SEA, 'fill-opacity': 0.22 } });
  map.addLayer({ id: 'protectedAll-line', type: 'line', source: 'protectedAll', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': SEA, 'line-width': 1.5 } });
  map.addLayer({ id: 'protectedAll-pt', type: 'circle', source: 'protectedAll', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': SEA, 'circle-opacity': 0.7, 'circle-stroke-color': '#f4f5ed', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'alertsAll-fill', type: 'fill', source: 'alertsAll', paint: { 'fill-color': CORAL, 'fill-opacity': 0.14 } });
  map.addLayer({ id: 'alertsAll-line', type: 'line', source: 'alertsAll', paint: { 'line-color': CORAL, 'line-width': 1, 'line-opacity': 0.6 } });
  map.addLayer({ id: 'boundaries', type: 'line', source: 'boundaries', paint: { 'line-color': '#5a6f73', 'line-width': 1.4, 'line-dasharray': [3, 2] } });
  map.addLayer({ id: 'pfzAll', type: 'line', source: 'pfzAll', layout: { 'line-cap': 'round' }, paint: { 'line-color': TEAL, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 9, 5] } });
  map.addLayer({ id: 'a-alerts-fill', type: 'fill', source: 'a-alerts', paint: { 'fill-color': CORAL, 'fill-opacity': 0.22 } });
  map.addLayer({ id: 'a-alerts-line', type: 'line', source: 'a-alerts', paint: { 'line-color': CORAL, 'line-width': 2 } });
  map.addLayer({ id: 'a-protected-fill', type: 'fill', source: 'a-protected', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': SEA, 'fill-opacity': 0.4 } });
  map.addLayer({ id: 'a-protected-line', type: 'line', source: 'a-protected', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': TEAL, 'line-width': 2 } });
  map.addLayer({ id: 'a-protected-pt', type: 'circle', source: 'a-protected', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 8, 'circle-color': SEA, 'circle-stroke-color': '#f4f5ed', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'a-pfz', type: 'line', source: 'a-pfz', paint: { 'line-color': CORAL, 'line-width': 4 } });
  map.addLayer({ id: 'a-geofence', type: 'line', source: 'a-geofence', paint: { 'line-color': CORAL, 'line-width': 2, 'line-dasharray': [1, 2] } });
  map.addLayer({ id: 'a-routes', type: 'line', source: 'a-routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
    'line-color': ['match', ['get', 'profile'], 'shortest', '#6d8a8e', 'balanced', TEAL, SEA],
    'line-width': ['match', ['get', 'profile'], 'safer', 5, 3.5],
    'line-dasharray': ['match', ['get', 'profile'], 'shortest', ['literal', [2, 2]], ['literal', [1, 0]]] as never,
  } });
  map.addLayer({ id: 'a-hotspots', type: 'circle', source: 'a-hotspots', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'chl'], 0.3, 6, 5, 14], 'circle-color': CORAL, 'circle-opacity': 0.7, 'circle-stroke-color': '#f4f5ed', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'a-ports', type: 'circle', source: 'a-ports', paint: { 'circle-radius': 9, 'circle-color': '#f4f5ed', 'circle-stroke-color': TEAL, 'circle-stroke-width': 4 } });
  map.addLayer({ id: 'a-location', type: 'circle', source: 'a-location', paint: { 'circle-radius': 9, 'circle-color': ['match', ['get', 'role'], 'dest', CORAL, TEAL], 'circle-stroke-color': '#f4f5ed', 'circle-stroke-width': 3 } });
  map.addLayer({ id: 'pick', type: 'circle', source: 'pick', paint: { 'circle-radius': 9, 'circle-color': CORAL, 'circle-stroke-color': '#f4f5ed', 'circle-stroke-width': 3 } });
}

const setData = (map: MLMap, id: string, data: unknown) => (map.getSource(id) as GeoJSONSource | undefined)?.setData((data ?? EMPTY) as never);

export function MapView({ agent, fit, toggles, onToggle, onPick, picked, className = '', legend = true }: {
  agent?: Record<string, unknown>; fit?: [number, number, number, number]; toggles: LayerToggles; onToggle?: (k: keyof LayerToggles) => void;
  onPick?: (p: LonLat) => void; picked?: LonLat | null; className?: string; legend?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [ready, setReady] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const map = new maplibregl.Map({ container: host.current, style: STYLE, bounds: INDIA, fitBoundsOptions: { padding: 20 }, attributionControl: { compact: true }, cooperativeGestures: false });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => { install(map); setReady(true); });
    map.on('click', (e) => pickRef.current?.([e.lngLat.lng, e.lngLat.lat]));
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(host.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // national context layers: fetched live, only when switched on
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const wire = (toggle: boolean, key: 'pfz' | 'boundaries' | 'alerts' | 'protected', source: string, layers: string[]) => {
      layers.forEach((l) => map.setLayoutProperty(l, 'visibility', toggle ? 'visible' : 'none'));
      if (toggle) load(key).then((d) => { setData(map, source, d); setLayerError(null); }).catch((e) => setLayerError(`${key} layer unavailable: ${e.message}`));
    };
    wire(toggles.pfz, 'pfz', 'pfzAll', ['pfzAll']);
    wire(toggles.boundaries, 'boundaries', 'boundaries', ['boundaries']);
    wire(toggles.alerts, 'alerts', 'alertsAll', ['alertsAll-fill', 'alertsAll-line']);
    wire(toggles.protected, 'protected', 'protectedAll', ['protectedAll-fill', 'protectedAll-line', 'protectedAll-pt']);
  }, [ready, toggles.pfz, toggles.boundaries, toggles.alerts, toggles.protected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setData(map, 'a-pfz', agent?.['pfz']);
    setData(map, 'a-alerts', agent?.['alerts']);
    setData(map, 'a-geofence', agent?.['geofence']);
    setData(map, 'a-protected', agent?.['protected']);
    setData(map, 'a-routes', agent?.['routes']);
    setData(map, 'a-hotspots', agent?.['hotspots']);
    setData(map, 'a-location', agent?.['location']);
    setData(map, 'a-ports', agent?.['ports']);
  }, [ready, agent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !fit) return;
    map.fitBounds([[fit[0], fit[1]], [fit[2], fit[3]]], { padding: 50, maxZoom: 10, duration: 700 });
  }, [ready, fit]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setData(map, 'pick', picked ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: picked } }] } : EMPTY);
  }, [ready, picked]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[hsl(var(--primary))]/20 bg-[#dfece5] ${className}`}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} role="application" aria-label="Interactive marine map of the Indian coast" />
      {!ready && <div className="page-grid absolute inset-0 grid place-items-center font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Loading map…</div>}
      {legend && (
        <div className="absolute left-3 top-3 z-10 rounded-lg bg-[hsl(var(--card))]/92 p-2.5 backdrop-blur-sm">
          <p className="flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"><Layers size={11} /> Live layers</p>
          {([['pfz', 'PFZ advisory'], ['boundaries', 'Maritime boundaries'], ['alerts', 'Official alerts'], ['protected', 'Protected areas']] as const).map(([k, label]) => (
            <label key={k} className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--primary))]">
              <input type="checkbox" checked={toggles[k]} onChange={() => onToggle?.(k)} disabled={!onToggle} className="h-3.5 w-3.5 accent-[hsl(var(--accent))]" data-testid={`toggle-layer-${k}`} />{label}
            </label>
          ))}
        </div>
      )}
      {layerError && <div role="alert" className="absolute bottom-3 left-3 z-10 max-w-[80%] rounded bg-[hsl(var(--card))]/95 px-3 py-2 text-[11px] text-[hsl(var(--accent))]">{layerError}</div>}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden items-center gap-1.5 rounded-full bg-[hsl(var(--card))]/85 px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] sm:flex"><Compass size={11} /> Not for navigation</div>
    </div>
  );
}
