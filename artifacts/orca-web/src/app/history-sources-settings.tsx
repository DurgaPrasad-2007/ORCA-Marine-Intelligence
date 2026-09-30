import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Check, Trash2 } from 'lucide-react';
import { api, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LANGUAGES, ROLES } from './auth-pages';
import { Btn, Card, Empty, ErrorNote, Field, Mono, Page, PageHeader, Spinner, StatusChip, fmtTime, inputCls } from './ui';

// ------------------------------------------------------------------ history
export function HistoryPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['conversations'], queryFn: () => api<{ conversations: Array<{ id: number; title: string; updated_at: string; messages: number }> }>('/conversations') });
  const del = useMutation({ mutationFn: (id: number) => api(`/conversations/${id}`, { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['overview'] }); } });
  return (
    <>
      <PageHeader eyebrow="05 / History" title="Every answer, replayable." body="Conversations are saved with their evidence and agent trace, so any recommendation can be reopened and checked later." />
      <Page>
        {list.isLoading && <Spinner label="Loading conversations" />}
        {list.isError && <ErrorNote>{(list.error as Error).message}</ErrorNote>}
        {list.data?.conversations.length === 0 && <Empty title="Nothing here yet" body="Ask ORCA a question and the conversation is saved automatically." action={<Link href="/app/ask" className="rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))]">Ask ORCA</Link>} />}
        <ul className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
          {list.data?.conversations.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 py-4">
              <Link href={`/app/ask?c=${c.id}`} data-testid="link-conversation" className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]">{c.title}</p><Mono className="mt-1 normal-case tracking-normal">{c.messages} messages · updated {fmtTime(`${c.updated_at.replace(' ', 'T')}Z`)}</Mono></Link>
              <button type="button" onClick={() => del.mutate(c.id)} aria-label={`Delete conversation: ${c.title}`} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}

// ------------------------------------------------------------------ sources
type Health = { id: string; name: string; provider: string; use: string; ok: boolean; status: string; ms: number; observedAt?: string; note?: string; error?: string; url?: string };
type Thresholds = { rows: Array<{ factor: string; caution: string; avoid: string; basis: string }> };
const NOT_CONNECTED = [
  ['Lightning strike detection', 'No public API found. Thunderstorm risk uses forecast weather codes plus the text of official alerts, and is labelled as a proxy.'],
  ['Restricted, danger and naval zones', 'No verified open source. ORCA checks international maritime boundaries and protected areas only, and says so.'],
  ['Complete protected-area coverage', 'The public WDPA service holds only part of India (about 60 polygons and a few marine sites), so a miss never proves an area is unrestricted.'],
  ['ISRO Oceansat-3 / MOSDAC products', 'Requires registered credentials. PFZ advisories from INCOIS already embody these satellite products.'],
  ['Tide tables', 'Not connected. Sea level is a model proxy from the marine forecast, labelled as such.'],
  ['Vessel telemetry, AIS, catch or landings data', 'Not connected. ORCA cannot attribute changes in catch.'],
];

export function SourcesPage() {
  const health = useQuery({ queryKey: ['sources'], queryFn: () => api<{ sources: Health[]; checkedAt: string }>('/sources'), refetchInterval: 90_000 });
  const th = useQuery({ queryKey: ['thresholds'], queryFn: () => api<Thresholds>('/thresholds') });
  return (
    <>
      <PageHeader eyebrow="06 / Data sources" title="What ORCA knows, and what it doesn't." body="Every source is checked live, right now, by actually calling it. Nothing on this page is assumed." />
      <Page>
        {health.isLoading && <Spinner label="Calling every source" />}
        {health.isError && <ErrorNote>{(health.error as Error).message}</ErrorNote>}
        {health.data && (
          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]">
            <div className="hidden grid-cols-[1.3fr_1fr_.7fr_.7fr] border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] md:grid"><span>Source</span><span>Provider</span><span>Status</span><span>Data time</span></div>
            {health.data.sources.map((s, i) => (
              <div key={s.id} className="grid gap-2 border-b border-[hsl(var(--border))] px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_1fr_.7fr_.7fr] md:items-center md:gap-4" data-testid={`source-${s.id}`}>
                <div><span className="font-mono-ui text-[9px] text-[hsl(var(--accent))]">0{i + 1}</span><p className="text-sm font-semibold text-[hsl(var(--primary))]">{s.name}</p><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{s.use}</p></div>
                <p className="text-sm text-[hsl(var(--primary))]">{s.provider}</p>
                <div><StatusChip status={s.status} /><p className="mt-1 font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{s.ms} ms</p></div>
                <div className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{s.ok ? fmtTime(s.observedAt, s.observedAt?.length === 10 ? { day: 'numeric', month: 'short', year: 'numeric' } : undefined) : <span className="text-[hsl(var(--accent))]">{s.error}</span>}</div>
              </div>
            ))}
          </div>
        )}
        {health.data && <Mono className="mt-3 normal-case tracking-normal">Last checked {fmtTime(health.data.checkedAt)} · cached for 60 s · satellite products naturally lag about 2 days, PFZ is issued about 3 times a week.</Mono>}

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Card tone="sand">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Not connected</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">ORCA will say so whenever one of these matters to an answer. It never approximates them.</p>
            <ul className="mt-4 space-y-4">{NOT_CONNECTED.map(([k, v]) => <li key={k} className="border-l-2 border-[hsl(var(--accent))] pl-4"><p className="text-sm font-semibold text-[hsl(var(--primary))]">{k}</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{v}</p></li>)}</ul>
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Risk thresholds and their basis</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">These live in code and are shown with every screening. Only wind and gusts follow IMD's operational wording; the rest are labelled where they are demo thresholds.</p>
            {th.data && <div className="mt-4 divide-y divide-[hsl(var(--border))] text-sm">{th.data.rows.map((r) => <div key={r.factor} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3"><p className="font-medium text-[hsl(var(--primary))]">{r.factor}</p><p className="text-right text-xs text-[hsl(var(--muted-foreground))]">caution {r.caution} · avoid {r.avoid}</p><p className="col-span-2 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--accent))]">basis: {r.basis}</p></div>)}</div>}
          </Card>
        </div>
      </Page>
    </>
  );
}

// ------------------------------------------------------------------ settings
export function SettingsPage() {
  const { user, setUser, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [f, setF] = useState({ name: user?.name ?? '', role: user?.role ?? 'fisher', language: user?.language ?? 'English' });
  const [saved, setSaved] = useState(false);
  const save = useMutation({ mutationFn: () => api<{ user: User }>('/auth/me', { method: 'PATCH', body: f }), onSuccess: (r) => { setUser(r.user); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  return (
    <>
      <PageHeader eyebrow="07 / Settings" title="Your profile." body="Your language is used for voice input and as a hint to the agent. ORCA always answers in the language you write in." />
      <Page>
        <div className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <Field label="Name"><input required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} data-testid="input-profile-name" /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="I am a"><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={inputCls}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
              <Field label="Preferred language"><select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} className={inputCls} data-testid="select-profile-language">{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></Field>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Signed in as {user?.email}</p>
            {save.isError && <ErrorNote>{(save.error as Error).message}</ErrorNote>}
            <Btn type="submit" busy={save.isPending} data-testid="button-save-profile">{saved ? <><Check size={13} />Saved</> : 'Save changes'}</Btn>
          </form>
          <Card tone="sand" className="h-fit">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Your data</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">ORCA stores your account, saved locations and conversations so you can return to them. No marine data is stored: forecasts, PFZ and alerts are fetched live each time. Questions you ask are sent to Google's Gemini model to be interpreted.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link href="/privacy" className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">Privacy</Link><Link href="/ai-transparency" className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">AI transparency</Link></div>
            <Btn secondary type="button" className="mt-6" onClick={async () => { await signOut(); setLocation('/'); }}>Sign out</Btn>
          </Card>
        </div>
      </Page>
    </>
  );
}
