import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, BellRing, Database, Fish, MessageSquareText } from 'lucide-react';
import { api, type SavedLocation } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PlaceSearch, useAddLocation } from './locpicker';
import { useOverview } from './shell';
import { Card, ErrorNote, Eyebrow, Mono, Page, PageHeader, StatusChip, ago, fmtDate, fmtTime } from './ui';
import { WatchCard, type WatchItem } from './watch';

const q = (text: string, extra = '') => `/app/ask?q=${encodeURIComponent(text)}${extra}`;

export function OverviewPage() {
  const { user } = useAuth();
  const ov = useOverview();
  const add = useAddLocation();
  const watch = useQuery({ queryKey: ['watch'], queryFn: () => api<{ items: WatchItem[]; pfzIssued: string | null }>('/watch'), enabled: (ov.data?.locations ?? 0) > 0, refetchInterval: 300_000 });
  const locs = useQuery({ queryKey: ['locations'], queryFn: () => api<{ locations: SavedLocation[] }>('/locations') });
  const first = locs.data?.locations[0];
  const hour = new Date(Date.now() + 5.5 * 3.6e6).getUTCHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const prompts = first
    ? [`Is it safe to fish near ${first.name} tomorrow morning?`, `Where is the nearest PFZ to ${first.name} today?`, `Are there cyclone or lightning alerts near ${first.name}?`, `Find a safer route from ${first.name} to the nearest PFZ`]
    : ['Where is the nearest PFZ today near Visakhapatnam?', 'Is it safe to venture into the sea tomorrow morning near Digha?', 'Are there cyclone or lightning alerts near Puri?', 'Which regions show high chlorophyll and favourable SST near Kochi?'];

  return (
    <>
      <PageHeader eyebrow="01 / Overview" title={`${greet}, ${user?.name.split(' ')[0]}.`} body="Today's live picture of the sources ORCA reasons over, your watched locations, and where to start." actions={<Link href="/app/ask" className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]" data-testid="link-ask-cta">Ask ORCA <ArrowUpRight size={14} /></Link>} />
      <Page>
        {ov.isError && <div className="mb-6"><ErrorNote>Could not load the live overview: {(ov.error as Error).message}</ErrorNote></div>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <Fish size={20} className="text-[hsl(var(--accent))]" />
            <Mono className="mt-6">PFZ advisory · INCOIS</Mono>
            {ov.data?.pfz ? <><p className="mt-1 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">{fmtDate(ov.data.pfz.issued)}</p><div className="mt-2 flex items-center gap-2"><StatusChip status={ov.data.pfz.status} /><span className="text-xs text-[hsl(var(--muted-foreground))]">{ov.data.pfz.lines} zone lines</span></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Issued {ago(ov.data.pfz.issued)}. Derived by INCOIS from satellite SST and chlorophyll.</p></>
              : <><p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Unavailable</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The INCOIS PFZ service did not respond. ORCA will say so instead of guessing.</p></>}
          </Card>
          <Card>
            <BellRing size={20} className="text-[hsl(var(--accent))]" />
            <Mono className="mt-6">Official alerts · last 24 h</Mono>
            {ov.data?.alerts ? <><p className="mt-1 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">{ov.data.alerts.count24h}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">NDMA SACHET CAP feed (IMD, INCOIS, state authorities), all India. {ov.data.alerts.latest[0] && <>Latest {ago(ov.data.alerts.latest[0].published)} from {ov.data.alerts.latest[0].sender}.</>}</p><Link href="/app/watch?tab=alerts" className="mt-3 inline-block font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">Read the feed</Link></>
              : <><p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Unavailable</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The alert feed did not respond. Check IMD / INCOIS directly.</p></>}
          </Card>
          <Card>
            <Database size={20} className="text-[hsl(var(--accent))]" />
            <Mono className="mt-6">Live sources reachable</Mono>
            {ov.data?.sources ? <><p className="mt-1 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">{ov.data.sources.ok} / {ov.data.sources.total}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{ov.data.sources.down.length ? `Not responding: ${ov.data.sources.down.join(', ')}.` : 'Every source responded to a live check just now.'}</p><Link href="/app/sources" className="mt-3 inline-block font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">Source health</Link></>
              : <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Checking…</p>}
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="flex items-end justify-between"><div><Eyebrow>Your watchlist</Eyebrow><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Conditions at your locations</h2></div>{(ov.data?.locations ?? 0) > 0 && <Link href="/app/watch" className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">Manage</Link>}</div>
            {(ov.data?.locations ?? 0) === 0 ? (
              <Card tone="sea" className="mt-5">
                <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Start with your harbour.</p>
                <p className="mb-5 mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Add the place you fish from or manage. ORCA will show its live risk screening, nearest PFZ and any official alert for the next 12 hours, and you can say “my harbour” in questions.</p>
                <PlaceSearch onPick={(p) => add.mutate({ name: p.name, lat: p.lat, lon: p.lon })} cta="Find" />
                {add.isError && <div className="mt-3"><ErrorNote>{(add.error as Error).message}</ErrorNote></div>}
              </Card>
            ) : (
              <div className="mt-5 space-y-3">
                {watch.isLoading && <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]" role="status">Screening your locations against live forecasts…</p>}
                {watch.isError && <ErrorNote>{(watch.error as Error).message}</ErrorNote>}
                {watch.data?.items.slice(0, 3).map((i) => <WatchCard key={i.id} item={i} compact />)}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Eyebrow>Start a question</Eyebrow>
              <div className="mt-4 space-y-2">
                {prompts.map((p) => <Link key={p} href={q(p)} data-testid="prompt-link" className="group flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm leading-5 text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--accent))]"><span>{p}</span><MessageSquareText size={15} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" /></Link>)}
              </div>
            </div>
            {ov.data && ov.data.conversations.length > 0 && (
              <div>
                <Eyebrow>Recent conversations</Eyebrow>
                <ul className="mt-4 divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
                  {ov.data.conversations.map((c) => <li key={c.id}><Link href={`/app/ask?c=${c.id}`} className="flex items-center justify-between gap-3 py-3 text-sm text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]"><span className="truncate">{c.title}</span><span className="shrink-0 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">{fmtTime(c.updated_at.replace(' ', 'T') + 'Z', { day: 'numeric', month: 'short' })}</span></Link></li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {ov.data?.alerts && ov.data.alerts.latest.length > 0 && (
          <div className="mt-10">
            <Eyebrow>Latest official alerts</Eyebrow>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {ov.data.alerts.latest.slice(0, 4).map((a) => <li key={a.id} className="border-l-2 border-[hsl(var(--accent))] pl-4 text-sm leading-6 text-[hsl(var(--primary))]">{a.title}<Mono className="mt-1 normal-case tracking-normal">{a.sender} · {fmtTime(a.published)}</Mono></li>)}
            </ul>
          </div>
        )}
      </Page>
    </>
  );
}
