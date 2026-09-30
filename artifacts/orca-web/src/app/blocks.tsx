// Renders what the agent's tools produced: risk, PFZ, charts, alerts, routes, geofence, hotspots, plus evidence and trace.
import { useState, type ReactNode } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ChevronDown, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Answer, Block, Evidence, TraceStep } from '@/lib/api';
import { Mono, RiskBadge, StatusChip, fmtDate, fmtTime } from './ui';

const LINES = ['#103d42', '#e0715c', '#28786e', '#6d8a8e'];

const Shell = ({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) => (
  <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-display text-lg font-semibold leading-tight tracking-[-0.03em] text-[hsl(var(--primary))]">{title}</h3>
      {tag && <span className="shrink-0 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">{tag}</span>}
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

function Risk({ b }: { b: Block }) {
  const hourly: Array<{ time: string; level: string; wave: number | null; wind: number | null; gust: number | null }> = b['hourly'] ?? [];
  const cell = { ok: 'bg-[hsl(var(--secondary))]', caution: 'bg-[hsl(var(--accent))]/55', avoid: 'bg-[hsl(var(--destructive))]', unknown: 'bg-[hsl(var(--muted))]' } as Record<string, string>;
  return (
    <Shell title="Safety screening" tag="model-based · not a clearance">
      <div className="flex flex-wrap items-center gap-3"><RiskBadge level={b['level']} big /><span className="text-xs text-[hsl(var(--muted-foreground))]">{b.title.split('·')[1]?.trim()}</span></div>
      {b['best'] ? <p className="mt-3 text-sm text-[hsl(var(--primary))]"><span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Best window </span>{fmtTime(b['best'].from)} → {fmtTime(b['best'].to, { hour: '2-digit', minute: '2-digit', hour12: false })} ({b['best'].hours} h)</p> : <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">No continuous lower-risk window of 3 h or more in the period.</p>}
      {hourly.length > 0 && (
        <div className="mt-3" aria-label="Hourly risk timeline">
          <div className="flex gap-px overflow-hidden rounded">{hourly.map((h) => <div key={h.time} title={`${fmtTime(h.time)} · ${h.level} · wave ${h.wave ?? 'n/a'} m · wind ${h.wind ?? 'n/a'} km/h`} className={`h-4 flex-1 ${cell[h.level]}`} />)}</div>
          <Mono className="mt-1 flex justify-between"><span>{fmtTime(hourly[0]!.time, { hour: '2-digit', minute: '2-digit', hour12: false })}</span><span>lower risk / caution / high risk</span><span>{fmtTime(hourly.at(-1)!.time, { hour: '2-digit', minute: '2-digit', hour12: false })}</span></Mono>
        </div>
      )}
      <div className="mt-4 divide-y divide-[hsl(var(--border))] border-t border-[hsl(var(--border))]">
        {(b['factors'] as Array<{ label: string; value: string; level: string; threshold: string; basis: string }>).map((f) => (
          <div key={f.label} className="grid gap-1 py-2.5 sm:grid-cols-[1.2fr_.8fr_auto] sm:items-center sm:gap-3">
            <div><p className="text-sm font-medium text-[hsl(var(--primary))]">{f.label}</p><Mono className="mt-0.5 normal-case tracking-normal">{f.threshold} · basis: {f.basis}</Mono></div>
            <p className="text-sm text-[hsl(var(--primary))]">{f.value}</p>
            <RiskBadge level={f.level} />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-[hsl(var(--secondary))] p-3">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Confidence · {b['confidence'].level} <span className="text-[hsl(var(--muted-foreground))]">({b['confidence'].method})</span></p>
        <ul className="mt-1.5 space-y-1 text-xs leading-5 text-[hsl(var(--primary))]">{b['confidence'].reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>
      </div>
      {b['missing']?.length > 0 && <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[hsl(var(--accent))]"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Not available to this run: {b['missing'].join('; ')}.</p>}
      {b['alerts']?.length > 0 && <AlertList alerts={b['alerts']} />}
    </Shell>
  );
}

function AlertList({ alerts }: { alerts: Array<{ title: string; sender: string; published: string; distKm: number; link?: string; event?: string | null; severity?: string | null; matchedBy?: string }> }) {
  return (
    <ul className="mt-3 space-y-2">
      {alerts.map((a, i) => (
        <li key={i} className="border-l-2 border-[hsl(var(--accent))] pl-3 text-xs leading-5 text-[hsl(var(--primary))]">
          {a.event && <span className="mr-2 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">{a.event}{a.severity ? ` · ${a.severity}` : ''}</span>}{a.title}
          <Mono className="mt-1 normal-case tracking-normal">{a.sender} · {fmtTime(a.published)} · {a.matchedBy === 'district name' ? 'matched by district name' : a.distKm === 0 ? 'inside alert area' : `${a.distKm} km from alert area`}{a.link && <> · <a href={a.link} target="_blank" rel="noreferrer" className="underline underline-offset-2">CAP source</a></>}</Mono>
        </li>
      ))}
    </ul>
  );
}

function Pfz({ b }: { b: Block }) {
  const zones: Array<any> = b['zones'];
  return (
    <Shell title={b.title} tag={`INCOIS · ${b['advisoryStatus'] ?? ''}`}>
      {!zones.length ? <p className="text-sm text-[hsl(var(--muted-foreground))]">No PFZ line in range in the current advisory.</p> : (
        <ol className="divide-y divide-[hsl(var(--border))]">
          {zones.map((z, i) => (
            <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div><p className="text-sm font-medium text-[hsl(var(--primary))]"><span className="mr-2 font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span>{z.distance_km} km {z.direction}</p><Mono className="mt-0.5 normal-case tracking-normal">Zone {z.id} · {z.sector} · issued {fmtDate(z.issued)} · nearest point {z.nearest_lat}°N {z.nearest_lon}°E</Mono>{z.risk_reasons?.length > 0 && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{z.risk_reasons.join('; ')}</p>}</div>
              <div className="flex flex-wrap items-center gap-2">{z.near_international_boundary && <span className="rounded-full border border-[hsl(var(--accent))]/50 px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--accent))]">Within 15 km of boundary</span>}{z.forecast_risk && <RiskBadge level={z.forecast_risk} />}</div>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

function ChartBlock({ b }: { b: Block }) {
  const keys: Array<{ k: string; label: string }> = b['keys'];
  const data = (b['series'] as Array<Record<string, any>>).map((d) => ({ ...d, t: d['time'].length > 10 ? fmtTime(d['time'], { hour: '2-digit', hour12: false, day: 'numeric' }) : fmtDate(d['time']) }));
  return (
    <Shell title={b.title} tag="live model / satellite">
      <div className="h-52 w-full" role="img" aria-label={b.title}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((k, i) => <Line key={k.k} type="monotone" dataKey={k.k} name={k.label} stroke={LINES[i % LINES.length]} strokeWidth={2} strokeDasharray={i === 3 ? '4 3' : undefined} dot={false} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}

function Alerts({ b }: { b: Block }) {
  return (
    <Shell title={b.title} tag="NDMA SACHET · CAP">
      {b['incomplete'] && <p className="mb-2 flex items-start gap-2 text-xs text-[hsl(var(--accent))]"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Check incomplete: {b['incomplete']}.</p>}
      {b['alerts'].length ? <AlertList alerts={b['alerts']} /> : <p className="text-sm text-[hsl(var(--muted-foreground))]">No official alert area contains or touches this point in the checked period.</p>}
      {b['cyclones']?.length > 0 && <p className="mt-3 text-sm text-[hsl(var(--primary))]">Active cyclones (GDACS): {b['cyclones'].map((c: any) => `${c.name} · ${c.alertLevel} · ${c.km} km away`).join('; ')}</p>}
    </Shell>
  );
}

function RouteBlock({ b }: { b: Block }) {
  const style: Record<string, string> = { shortest: 'border-t-2 border-dashed border-[#6d8a8e]', balanced: 'border-t-[3px] border-[hsl(var(--primary))]', safer: 'border-t-[5px] border-[#28786e]' };
  return (
    <Shell title={b.title} tag={`${b['grid']} · ${b['speedKnots']} kn`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {(b['routes'] as Array<any>).map((r) => (
          <div key={r.profile} className="rounded-lg bg-[hsl(var(--secondary))] p-3">
            <div className={`mb-2 w-10 ${style[r.profile]}`} aria-hidden />
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--primary))]">{r.profile}</p>
            <p className="mt-1 text-sm text-[hsl(var(--primary))]">{r.distance_km} km · {r.eta_hours} h</p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Peak wave {r.max_wave_m_on_route ?? 'n/a'} m · peak wind {r.max_wind_kmh_on_route ?? 'n/a'} km/h</p>
            {r.boundaries_avoided?.length > 0 && <p className="mt-1 text-xs text-[hsl(var(--accent))]">Avoids {r.boundaries_avoided.join(', ')}</p>}
          </div>
        ))}
      </div>
      <Mono className="mt-3 normal-case tracking-normal">Coarse forecast grid decision support. Land and international boundaries are hard constraints. Not a navigation instruction.</Mono>
    </Shell>
  );
}

function Geofence({ b }: { b: Block }) {
  return (
    <Shell title={b.title} tag="Marine Regions (VLIZ)">
      {b['boundaries'].length ? <ul className="space-y-2">{b['boundaries'].map((x: any) => <li key={x.name} className="text-sm text-[hsl(var(--primary))]">{x.km} km {x.dir} · {x.name}{x.agreement && <Mono className="normal-case tracking-normal">{x.agreement}</Mono>}</li>)}</ul> : <p className="text-sm text-[hsl(var(--muted-foreground))]">No international boundary in range.</p>}
      <Mono className="mt-3 normal-case tracking-normal">Restricted, danger and naval zones are not checked: no verified public source exists. Protected areas are checked separately.</Mono>
    </Shell>
  );
}

function Coast({ b }: { b: Block }) {
  return (
    <Shell title={b.title} tag="derived from ocean model">
      {b['coasts'].length ? <ol className="divide-y divide-[hsl(var(--border))]">{b['coasts'].map((c: any, i: number) => <li key={i} className="py-2 text-sm text-[hsl(var(--primary))]"><span className="mr-2 font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span>{c.name ?? 'Unnamed shore'} · {c.distance_km} km {c.direction}<Mono className="mt-0.5 normal-case tracking-normal">Last sea position {c.sea_edge_lat}°N {c.sea_edge_lon}°E</Mono></li>)}</ol> : <p className="text-sm text-[hsl(var(--muted-foreground))]">No coast found in range.</p>}
      <Mono className="mt-3 normal-case tracking-normal">Approximate model coastline. The place is the nearest settlement, not a verified harbour or landing site.</Mono>
    </Shell>
  );
}

function ProtectedBlock({ b }: { b: Block }) {
  return (
    <Shell title={b.title} tag="UNEP-WCMC WDPA · partial coverage">
      {b['areas'].length ? <ul className="space-y-2">{b['areas'].map((a: any) => <li key={a.name} className="text-sm text-[hsl(var(--primary))]">{a.inside ? 'Inside' : `${a.km} km from`} <strong>{a.name}</strong><Mono className="mt-0.5 normal-case tracking-normal">{a.designation}{a.iucn ? ` · IUCN ${a.iucn}` : ''} · {a.realm}</Mono></li>)}</ul> : <p className="text-sm text-[hsl(var(--muted-foreground))]">None found in the database within range.</p>}
      <Mono className="mt-3 normal-case tracking-normal">Coverage of India in this public database is partial: an empty result does not prove there is no protected or restricted area. Boundaries are informational, not legal. Restricted, danger and naval zones are not checked.</Mono>
    </Shell>
  );
}

function Hotspots({ b }: { b: Block }) {
  const t = b['thresholds'];
  return (
    <Shell title={b.title} tag={`satellite ${b['observed'] ? fmtDate(b['observed'].slice(0, 10)) : ''}`}>
      <Mono className="normal-case tracking-normal">Chlorophyll ≥ {t.min_chlorophyll} mg/m³{t.min_sst !== undefined && ` · SST ≥ ${t.min_sst} °C`}{t.max_sst !== undefined && ` · SST ≤ ${t.max_sst} °C`}</Mono>
      <ol className="mt-2 divide-y divide-[hsl(var(--border))]">{(b['cells'] as Array<any>).map((c, i) => <li key={i} className="py-2 text-sm text-[hsl(var(--primary))]"><span className="mr-2 font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span>{c.chlorophyll} mg/m³ · {c.sst ?? 'no'} °C SST · {c.lat}°N {c.lon}°E{c.place && <span className="text-[hsl(var(--muted-foreground))]"> · near {c.place}</span>}</li>)}</ol>
    </Shell>
  );
}

export function AnswerBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'risk': return <Risk key={i} b={b} />;
          case 'pfz': return <Pfz key={i} b={b} />;
          case 'chart': return <ChartBlock key={i} b={b} />;
          case 'alerts': return <Alerts key={i} b={b} />;
          case 'route': return <RouteBlock key={i} b={b} />;
          case 'geofence': return <Geofence key={i} b={b} />;
          case 'hotspots': return <Hotspots key={i} b={b} />;
          case 'protected': return <ProtectedBlock key={i} b={b} />;
          case 'coast': return <Coast key={i} b={b} />;
          default: return null;
        }
      })}
    </div>
  );
}

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (!evidence.length) return <p className="text-sm text-[hsl(var(--muted-foreground))]">No sources were queried for this answer.</p>;
  return (
    <ul className="space-y-3">
      {evidence.map((e) => (
        <li key={e.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">{e.id}</span><StatusChip status={e.status} /></div>
          <p className="mt-2 text-sm font-semibold text-[hsl(var(--primary))]">{e.source}</p>
          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{e.product}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-[hsl(var(--primary))]">
            {e.observedAt && <><dt className="text-[hsl(var(--muted-foreground))]">Observed</dt><dd>{fmtTime(e.observedAt, e.observedAt.length === 10 ? { day: 'numeric', month: 'short', year: 'numeric' } : undefined)}</dd></>}
            {e.validFrom && <><dt className="text-[hsl(var(--muted-foreground))]">Valid</dt><dd>{fmtTime(e.validFrom)} → {fmtTime(e.validTo)}</dd></>}
            <dt className="text-[hsl(var(--muted-foreground))]">Retrieved</dt><dd>{fmtTime(e.retrievedAt)}</dd>
            {e.resolution && <><dt className="text-[hsl(var(--muted-foreground))]">Resolution</dt><dd>{e.resolution}</dd></>}
          </dl>
          {e.note && <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{e.note}</p>}
          {/^https?:/.test(e.url) && <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[hsl(var(--accent))] underline underline-offset-4">Source request <ExternalLink size={11} /></a>}
        </li>
      ))}
    </ul>
  );
}

export function TraceList({ trace, totalMs, model }: { trace: TraceStep[]; totalMs?: number; model?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {model && <Mono className="mb-3 normal-case tracking-normal">Planner: {model} · {trace.length} tool call{trace.length === 1 ? '' : 's'}{totalMs ? ` · ${(totalMs / 1000).toFixed(1)} s total` : ''}. The model chose these tools and arguments; the tools computed every number.</Mono>}
      <ol className="space-y-2">
        {trace.map((s, i) => (
          <li key={i} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 p-3 text-left">
              <span className="min-w-0"><span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">{s.agent}</span><span className="block truncate text-sm font-medium text-[hsl(var(--primary))]">{s.tool}</span></span>
              <span className="flex shrink-0 items-center gap-2"><StatusChip status={s.status === 'ok' ? 'live' : s.status === 'failed' ? 'unavailable' : 'derived'} />{s.ms !== undefined && <span className="font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{s.ms} ms</span>}<ChevronDown size={14} className={`transition-transform ${open === i ? 'rotate-180' : ''}`} /></span>
            </button>
            {open === i && (
              <div className="space-y-2 border-t border-[hsl(var(--border))] p-3">
                <Mono>Arguments chosen by the model</Mono><pre className="overflow-x-auto rounded bg-[hsl(var(--muted))] p-2 text-[11px] leading-4 text-[hsl(var(--primary))]">{JSON.stringify(s.args, null, 2)}</pre>
                {s.detail && <p className="text-xs text-[hsl(var(--accent))]">{s.detail}</p>}
                {s.output && <><Mono>Result the model received</Mono><pre className="max-h-56 overflow-auto rounded bg-[hsl(var(--muted))] p-2 text-[11px] leading-4 text-[hsl(var(--primary))]">{s.output}</pre></>}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GroundingBadge({ g }: { g: Answer['grounding'] }) {
  if (!g.checked) return null;
  const ok = g.ungrounded.length === 0;
  return (
    <p className={`inline-flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-5 ${ok ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border border-[hsl(var(--accent))]/50 text-[hsl(var(--primary))]'}`}>
      {ok ? <ShieldCheck size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" />}
      {ok ? <>Number check: all {g.checked} numbers in this answer appear in tool results.</> : <>Number check: {g.ungrounded.join(', ')} not found in any tool result. Treat {g.ungrounded.length === 1 ? 'it' : 'them'} as unverified.</>}
    </p>
  );
}
