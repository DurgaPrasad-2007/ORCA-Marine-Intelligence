import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from 'wouter';
import { AlertTriangle, MapPin, MessageSquareText, Trash2 } from 'lucide-react';
import { api, type SavedLocation } from '@/lib/api';
import { PlaceSearch, useAddLocation } from './locpicker';
import { Card, Empty, ErrorNote, Field, Mono, Page, PageHeader, RiskBadge, Spinner, fmtTime, inputCls } from './ui';

export type WatchItem = SavedLocation & {
  ok: boolean; error?: string; overall?: string; wave?: string | null; wind?: string | null; gust?: string | null;
  alerts?: Array<{ id: string; title: string; sender: string; published: string; distKm: number; link: string }>; alertsChecked?: boolean;
  best?: { from: string; to: string; hours: number } | null; confidence?: string; missing?: string[]; nearestPfzKm?: number | null; boundary?: { name: string; km: number } | null; protectedArea?: { name: string; km: number; inside: boolean } | null;
};

export function WatchCard({ item, compact, onDelete }: { item: WatchItem; compact?: boolean; onDelete?: () => void }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]"><MapPin size={16} className="text-[hsl(var(--accent))]" />{item.name}</p>
          <Mono className="mt-1 normal-case tracking-normal">{item.kind} · {item.lat.toFixed(3)}°N {item.lon.toFixed(3)}°E · next 12 h</Mono>
        </div>
        {item.ok && item.overall && <RiskBadge level={item.overall} big />}
      </div>
      {!item.ok ? <div className="mt-4"><ErrorNote>Live screening unavailable for this location: {item.error}</ErrorNote></div> : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Wave (peak)', item.wave], ['Wind (peak)', item.wind], ['Gust (peak)', item.gust], ['Nearest PFZ', item.nearestPfzKm != null ? `${item.nearestPfzKm} km` : 'no zone found']].map(([k, v]) => <div key={k as string} className="rounded-lg bg-[hsl(var(--secondary))] p-3"><dt className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{k}</dt><dd className="mt-1 text-sm font-semibold text-[hsl(var(--primary))]">{v ?? 'no data'}</dd></div>)}
          </dl>
          {item.alerts && item.alerts.length > 0 && (
            <ul className="mt-4 space-y-2">{item.alerts.slice(0, compact ? 1 : 4).map((a) => <li key={a.id} className="flex gap-2 border-l-2 border-[hsl(var(--accent))] pl-3 text-xs leading-5 text-[hsl(var(--primary))]"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" /><span>{a.title}<Mono className="mt-1 normal-case tracking-normal">{a.sender} · {fmtTime(a.published)} · {a.distKm === 0 ? 'inside alert area' : `${a.distKm} km from alert area`}</Mono></span></li>)}</ul>
          )}
          {item.alerts?.length === 0 && item.alertsChecked && <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">No official alert area covers or touches this location (25 km).</p>}
          {!compact && (
            <div className="mt-3 space-y-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {item.best ? <p>Best window: {fmtTime(item.best.from)} → {fmtTime(item.best.to, { hour: '2-digit', minute: '2-digit', hour12: false })} ({item.best.hours} h)</p> : <p>No continuous lower-risk window of 3 h or more.</p>}
              <p>Confidence: {item.confidence}{item.missing && item.missing.length > 0 && ` · not available: ${item.missing.join('; ')}`}</p>
              {item.boundary && <p>{item.boundary.km} km from {item.boundary.name}</p>}
              {item.protectedArea && <p>{item.protectedArea.inside ? 'Inside' : `${item.protectedArea.km} km from`} protected area {item.protectedArea.name}</p>}
            </div>
          )}
        </>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[hsl(var(--border))] pt-3">
        <Link href={`/app/ask?q=${encodeURIComponent(`Is it safe to fish near ${item.name} tomorrow morning?`)}&lat=${item.lat}&lon=${item.lon}`} className="flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4"><MessageSquareText size={12} />Ask about tomorrow</Link>
        <Link href={`/app/map?lat=${item.lat}&lon=${item.lon}`} className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary))] underline underline-offset-4">On the map</Link>
        {onDelete && <button type="button" onClick={onDelete} aria-label={`Remove ${item.name}`} data-testid="button-delete-location" className="ml-auto flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"><Trash2 size={12} />Remove</button>}
      </div>
    </Card>
  );
}

function MyLocations() {
  const qc = useQueryClient();
  const watch = useQuery({ queryKey: ['watch'], queryFn: () => api<{ items: WatchItem[]; checkedAt: string; pfzIssued: string | null }>('/watch'), refetchInterval: 300_000 });
  const add = useAddLocation();
  const del = useMutation({ mutationFn: (id: number) => api(`/locations/${id}`, { method: 'DELETE' }), onSuccess: () => { for (const k of ['watch', 'locations', 'overview']) qc.invalidateQueries({ queryKey: [k] }); } });
  const [kind, setKind] = useState('harbour');
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_.6fr]">
      <div className="space-y-4">
        {watch.isLoading && <Spinner label="Screening locations against live forecasts" />}
        {watch.isError && <ErrorNote>{(watch.error as Error).message}</ErrorNote>}
        {watch.data?.items.length === 0 && <Empty title="No locations yet" body="Add your harbour or fishing ground. ORCA screens each one against live forecasts, official alerts and the PFZ advisory." />}
        {watch.data?.items.map((i) => <WatchCard key={i.id} item={i} onDelete={() => del.mutate(i.id)} />)}
        {watch.data && watch.data.items.length > 0 && <Mono className="normal-case tracking-normal">Checked {fmtTime(watch.data.checkedAt)} · refreshes every 5 minutes while open · same deterministic screening the agent uses, no model call.</Mono>}
      </div>
      <Card tone="sea" className="h-fit">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Add a location</h2>
        <div className="mt-4 space-y-4">
          <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls} data-testid="select-kind">{['harbour', 'fishing ground', 'home', 'other'].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <PlaceSearch onPick={(p) => add.mutate({ name: p.name, lat: p.lat, lon: p.lon, kind })} cta="Find" />
          {add.isError && <ErrorNote>{(add.error as Error).message}</ErrorNote>}
          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">You can also click the map on the Map page, or save a place from any ORCA answer. Up to 10 locations.</p>
        </div>
      </Card>
    </div>
  );
}

function AlertsFeed() {
  const feed = useQuery({ queryKey: ['alerts', 36], queryFn: () => api<{ alerts: Array<{ id: string; title: string; sender: string; published: string; link: string }> }>('/alerts?hours=36'), refetchInterval: 300_000 });
  const [filter, setFilter] = useState('all');
  const senders = useMemo(() => [...new Set(feed.data?.alerts.map((a) => a.sender) ?? [])].sort(), [feed.data]);
  const [text, setText] = useState('');
  const rows = (feed.data?.alerts ?? []).filter((a) => (filter === 'all' || a.sender === filter) && (!text || a.title.toLowerCase().includes(text.toLowerCase())));
  return (
    <div>
      <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Every official CAP alert published in the last 36 hours by IMD, INCOIS and state disaster authorities, all India, straight from NDMA SACHET. The feed has no structured hazard type, so read the text; ORCA's agent does the same.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by word, e.g. cyclone, Odisha" aria-label="Filter alerts" className={`${inputCls} max-w-xs`} data-testid="input-alert-filter" />
        {['all', ...senders].map((s) => <button key={s} type="button" onClick={() => setFilter(s)} aria-pressed={filter === s} className={`rounded-full border px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.1em] ${filter === s ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))]'}`}>{s}</button>)}
      </div>
      {feed.isLoading && <div className="mt-6"><Spinner label="Reading the CAP feed" /></div>}
      {feed.isError && <div className="mt-6"><ErrorNote>The official alert feed is unavailable: {(feed.error as Error).message}. Check IMD / INCOIS directly.</ErrorNote></div>}
      {feed.data && <p className="mt-5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{rows.length} of {feed.data.alerts.length} alerts</p>}
      <ul className="mt-3 divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
        {rows.map((a) => <li key={a.id} className="py-3.5"><p className="text-sm leading-6 text-[hsl(var(--primary))]">{a.title}</p><Mono className="mt-1 normal-case tracking-normal">{a.sender} · {fmtTime(a.published)} · <a href={a.link} target="_blank" rel="noreferrer" className="underline underline-offset-2">CAP source</a> · <Link href={`/app/ask?q=${encodeURIComponent(`What does this official alert mean for fishers, and which of my locations are affected? "${a.title.slice(0, 200)}"`)}`} className="text-[hsl(var(--accent))] underline underline-offset-2">Ask ORCA</Link></Mono></li>)}
      </ul>
    </div>
  );
}

export function WatchPage() {
  const search = useSearch();
  const [tab, setTab] = useState<'mine' | 'alerts'>(new URLSearchParams(search).get('tab') === 'alerts' ? 'alerts' : 'mine');
  return (
    <>
      <PageHeader eyebrow="04 / Watchlist & alerts" title="Watch your waters." body="Live risk screening for the places you care about, and every official alert as it is issued." />
      <Page>
        <div className="mb-6 flex gap-1 border-b border-[hsl(var(--border))]" role="tablist">
          {([['mine', 'My locations'], ['alerts', 'Official alerts']] as const).map(([t, label]) => <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} data-testid={`tab-${t}`} className={`-mb-px border-b-2 px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.13em] ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'border-transparent text-[hsl(var(--muted-foreground))]'}`}>{label}</button>)}
        </div>
        {tab === 'mine' ? <MyLocations /> : <AlertsFeed />}
      </Page>
    </>
  );
}
