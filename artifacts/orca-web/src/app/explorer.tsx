import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from 'wouter';
import { BookmarkPlus, MessageSquareText, MousePointerClick } from 'lucide-react';
import { api, type Evidence, type LonLat } from '@/lib/api';
import { PlaceSearch, useAddLocation } from './locpicker';
import { MapView, type LayerToggles } from './mapview';
import { Btn, ErrorNote, Mono, RiskBadge, Spinner, StatusChip, fmtDate, fmtTime } from './ui';

type Point = {
  name: string | null; lat: number; lon: number; overall: string;
  factors: Array<{ label: string; value: string; level: string; threshold: string; basis: string }>;
  best: { from: string; to: string; hours: number } | null; confidence: { level: string; reasons: string[] }; missing: string[];
  alerts: Array<{ id: string; title: string; sender: string; published: string; distKm: number }> | null;
  boundary: { name: string; km: number; dir: string } | null;
  pfz: Array<{ id: string; issued: string; km: number; dir: string }> | null; pfzIssued: string | null; evidence: Evidence[];
};

export function ExplorerPage() {
  const search = useSearch();
  const [toggles, setToggles] = useState<LayerToggles>({ pfz: true, boundaries: true, alerts: false, protected: true });
  const [picked, setPicked] = useState<LonLat | null>(null);
  const [fit, setFit] = useState<[number, number, number, number] | undefined>();
  const point = useMutation({ mutationFn: (p: LonLat) => api<Point>(`/point?lat=${p[1].toFixed(4)}&lon=${p[0].toFixed(4)}`) });
  const add = useAddLocation();
  const [saved, setSaved] = useState<string | null>(null);

  const pick = (p: LonLat) => { setPicked(p); setSaved(null); point.mutate(p); };

  useEffect(() => {
    const q = new URLSearchParams(search);
    const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
    if (q.has('lat') && Number.isFinite(lat) && Number.isFinite(lon)) { setFit([lon - 0.6, lat - 0.5, lon + 0.6, lat + 0.5]); pick([lon, lat]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = point.data;
  return (
    <div className="flex flex-col lg:h-[calc(100vh-82px)] lg:flex-row">
      <div className="relative h-[55vh] min-h-[380px] flex-1 p-4 lg:h-auto lg:p-5">
        <MapView className="h-full" toggles={toggles} onToggle={(k) => setToggles((t) => ({ ...t, [k]: !t[k] }))} onPick={pick} picked={picked} fit={fit} />
      </div>
      <aside className="w-full shrink-0 overflow-y-auto border-t border-[hsl(var(--border))] p-5 lg:w-[380px] lg:border-l lg:border-t-0" aria-label="Point briefing">
        <Mono className="text-[hsl(var(--accent))]">03 / Map explorer</Mono>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">Click anywhere at sea.</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Get the live screening, nearest PFZ, alerts and boundary distance for any point. PFZ lines and official alert areas are drawn from the live sources.</p>
        <div className="mt-5"><PlaceSearch onPick={(p) => { setFit([p.lon - 0.6, p.lat - 0.5, p.lon + 0.6, p.lat + 0.5]); pick([p.lon, p.lat]); }} label="Jump to a place" cta="Go" /></div>

        <div className="mt-6" aria-live="polite">
          {!picked && <div className="flex items-start gap-3 rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><MousePointerClick size={18} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" />No point selected yet.</div>}
          {point.isPending && <Spinner label="Screening this point against live sources" />}
          {point.isError && <ErrorNote>{(point.error as Error).message}</ErrorNote>}
          {d && !point.isPending && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Next 12 hours · model-based screening</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">{d.name ?? `${d.lat.toFixed(3)}°N, ${d.lon.toFixed(3)}°E`}</p>
                <div className="mt-3"><RiskBadge level={d.overall} big /></div>
                <p className="mt-3 text-xs leading-5 text-[hsl(var(--primary-foreground))]/65">{d.best ? `Best window ${fmtTime(d.best.from)} → ${fmtTime(d.best.to, { hour: '2-digit', minute: '2-digit', hour12: false })}.` : 'No continuous lower-risk window of 3 h or more.'} Confidence {d.confidence.level}.</p>
              </div>
              <ul className="divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {d.factors.map((f) => <li key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5"><span><span className="block text-sm text-[hsl(var(--primary))]">{f.label}</span><span className="block text-xs text-[hsl(var(--muted-foreground))]">{f.value}</span></span><RiskBadge level={f.level} /></li>)}
              </ul>
              {d.pfz && d.pfz.length > 0 && <div className="rounded-xl bg-[hsl(var(--secondary))] p-4"><Mono className="text-[hsl(var(--accent))]">Nearest PFZ · advisory {fmtDate(d.pfzIssued)}</Mono><ul className="mt-2 space-y-1 text-sm text-[hsl(var(--primary))]">{d.pfz.map((z) => <li key={z.id}>{z.km} km {z.dir} · zone {z.id}</li>)}</ul></div>}
              {d.boundary && <p className="text-sm text-[hsl(var(--primary))]">{d.boundary.km} km {d.boundary.dir} of {d.boundary.name}.</p>}
              {d.alerts && d.alerts.length > 0 && <ul className="space-y-2">{d.alerts.map((a) => <li key={a.id} className="border-l-2 border-[hsl(var(--accent))] pl-3 text-xs leading-5 text-[hsl(var(--primary))]">{a.title}<Mono className="mt-1 normal-case tracking-normal">{a.sender} · {fmtTime(a.published)}</Mono></li>)}</ul>}
              {d.missing.length > 0 && <ErrorNote>Not available to this screening: {d.missing.join('; ')}.</ErrorNote>}
              <div className="flex flex-wrap gap-2">
                <Link href={`/app/ask?q=${encodeURIComponent('Is it safe to fish here tomorrow morning, and where is the nearest PFZ?')}&lat=${d.lat}&lon=${d.lon}`} data-testid="link-ask-about-point" className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]"><MessageSquareText size={13} />Ask ORCA about this point</Link>
                <Btn small secondary type="button" data-testid="button-save-point" busy={add.isPending} onClick={() => add.mutate({ name: d.name ?? `${d.lat.toFixed(2)}N ${d.lon.toFixed(2)}E`, lat: d.lat, lon: d.lon, kind: 'fishing ground' }, { onSuccess: () => setSaved('Saved to your watchlist'), onError: (e) => setSaved((e as Error).message) })}><BookmarkPlus size={13} />Save to watchlist</Btn>
              </div>
              {saved && <p role="status" className="text-xs text-[hsl(var(--accent))]">{saved}</p>}
              <div><Mono>Sources for this briefing</Mono><div className="mt-2 flex flex-wrap gap-2">{d.evidence.map((e) => <span key={e.id} className="inline-flex items-center gap-2" title={e.source}><StatusChip status={e.status} /><span className="text-[11px] text-[hsl(var(--muted-foreground))]">{e.id.replace('E-', '')}</span></span>)}</div></div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
