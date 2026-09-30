import { type ReactNode, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Redirect, useLocation } from 'wouter';
import { Activity, AlertTriangle, BellRing, Clock, LayoutGrid, LogOut, Map as MapIcon, Menu, MessageSquareText, Settings, ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate } from './ui';
import type { WatchItem } from './watch';

export type Overview = {
  pfz: { issued?: string; status: string; lines: number } | null;
  alerts: { count24h: number; latest: Array<{ id: string; title: string; sender: string; published: string; link: string }> } | null;
  sources: { ok: number; total: number; down: string[] } | null;
  locations: number;
  conversations: Array<{ id: number; title: string; updated_at: string }>;
};
export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/overview'), refetchInterval: 120_000, staleTime: 60_000 });

const NAV = [
  { href: '/app', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/app/ask', label: 'Ask ORCA', icon: MessageSquareText },
  { href: '/app/map', label: 'Map', icon: MapIcon },
  { href: '/app/watch', label: 'Watchlist & alerts', icon: BellRing },
  { href: '/app/history', label: 'History', icon: Clock },
  { href: '/app/sources', label: 'Data sources', icon: Activity },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function Mark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--primary-foreground))]/30 bg-[hsl(var(--primary-foreground))]/10" aria-hidden="true">
      <span className="absolute h-5 w-5 rounded-full border border-[hsl(var(--accent))]" /><span className="absolute h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /><span className="absolute h-8 w-px rotate-45 bg-[hsl(var(--accent))]/60" />
    </span>
  );
}

/** Proactive heads-up across the whole app: any watched location with caution, an official alert nearby, or close to a boundary. */
function HeadsUp() {
  const { data: ov } = useOverview();
  const watch = useQuery({ queryKey: ['watch'], queryFn: () => api<{ items: WatchItem[] }>('/watch'), enabled: (ov?.locations ?? 0) > 0, refetchInterval: 300_000, staleTime: 120_000 });
  const flags = (watch.data?.items ?? []).flatMap((i) => {
    if (!i.ok) return [];
    const out: string[] = [];
    if (i.overall === 'HIGH RISK') out.push(`${i.name}: high risk in the next 12 h`);
    else if (i.overall === 'CAUTION') out.push(`${i.name}: caution in the next 12 h`);
    if (i.alerts && i.alerts.length) out.push(`${i.name}: ${i.alerts.length} official alert${i.alerts.length === 1 ? '' : 's'} nearby`);
    if (i.boundary && i.boundary.km < 15) out.push(`${i.name}: ${i.boundary.km} km from ${i.boundary.name}`);
    if (i.protectedArea && (i.protectedArea.inside || i.protectedArea.km < 5)) out.push(`${i.name}: ${i.protectedArea.inside ? 'inside' : `${i.protectedArea.km} km from`} ${i.protectedArea.name} (protected area)`);
    return out;
  });
  if (!flags.length) return null;
  return (
    <div role="alert" data-testid="heads-up" className="flex items-start gap-3 border-b border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/[.09] px-5 py-3 text-sm leading-6 text-[hsl(var(--primary))] lg:px-8">
      <AlertTriangle size={16} className="mt-1 shrink-0 text-[hsl(var(--accent))]" />
      <p><span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Heads-up · your watchlist </span>{flags.slice(0, 3).join(' · ')}{flags.length > 3 ? ` · +${flags.length - 3} more` : ''}. <Link href="/app/watch" className="underline underline-offset-4">Review</Link></p>
    </div>
  );
}

function StatusStrip() {
  const { data } = useOverview();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  const allUp = data?.sources && data.sources.ok === data.sources.total;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[hsl(var(--border))] bg-[#ebe9df] px-5 py-2 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] lg:px-8" data-testid="status-strip">
      <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${data ? (allUp ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]') : 'bg-[hsl(var(--muted-foreground))]'}`} />{data?.sources ? `${data.sources.ok}/${data.sources.total} sources reachable${data.sources.down.length ? ` · down: ${data.sources.down.join(', ')}` : ''}` : 'Checking sources…'}</span>
      <span>PFZ advisory {data?.pfz?.issued ? fmtDate(data.pfz.issued) : 'unavailable'}</span>
      <span className="ml-auto hidden sm:inline">{now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} IST</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location]);

  if (loading) return <div className="grid min-h-screen place-items-center font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]" role="status">Loading ORCA…</div>;
  if (!user) return <Redirect to={`/sign-in?next=${encodeURIComponent(location)}`} />;

  const nav = (
    <nav aria-label="App navigation" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? location === href : location.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} data-testid={`nav-${label.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.13em] transition-colors ${active ? 'bg-[hsl(var(--primary-foreground))]/10 text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary-foreground))]/70 hover:text-[hsl(var(--primary-foreground))]'}`}>
            <Icon size={15} />{label}
          </Link>
        );
      })}
    </nav>
  );
  const account = (
    <div className="border-t border-[hsl(var(--primary-foreground))]/15 pt-4">
      <p className="truncate text-sm font-medium text-[hsl(var(--primary-foreground))]">{user.name}</p>
      <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary-foreground))]/50">{user.role} · {user.language}</p>
      <div className="mt-3 flex items-center gap-4">
        <button type="button" onClick={async () => { await signOut(); setLocation('/'); }} data-testid="button-sign-out" className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))]/70 hover:text-[hsl(var(--accent))]"><LogOut size={13} />Sign out</button>
        <Link href="/trust" className="font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))]/50 hover:text-[hsl(var(--accent))]">Limits</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] lg:pl-[248px]">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[hsl(var(--primary))] focus:px-4 focus:py-3 focus:text-sm focus:text-[hsl(var(--primary-foreground))]">Skip to main content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col justify-between bg-[hsl(var(--primary))] p-5 lg:flex">
        <div>
          <Link href="/app" className="flex items-center gap-3" data-testid="link-app-logo"><Mark /><span className="font-display text-lg font-bold tracking-[-0.04em] text-[hsl(var(--primary-foreground))]">ORCA</span></Link>
          <div className="mt-8">{nav}</div>
        </div>
        {account}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[hsl(var(--primary-foreground))]/15 bg-[hsl(var(--primary))] px-5 py-3 lg:hidden">
        <Link href="/app" className="flex items-center gap-3"><Mark /><span className="font-display text-lg font-bold tracking-[-0.04em] text-[hsl(var(--primary-foreground))]">ORCA</span></Link>
        <button type="button" aria-expanded={open} aria-controls="app-drawer" onClick={() => setOpen(!open)} data-testid="button-app-menu" className="rounded-md p-2 text-[hsl(var(--primary-foreground))]">{open ? <X size={22} /> : <Menu size={22} />}<span className="sr-only">Toggle navigation</span></button>
      </header>
      {open && <div id="app-drawer" className="fixed inset-x-0 top-[57px] z-30 flex flex-col gap-6 bg-[hsl(var(--primary))] p-5 lg:hidden">{nav}{account}</div>}

      <StatusStrip />
      <HeadsUp />
      <div id="app-main" tabIndex={-1}>{children}</div>
      <p className="border-t border-[hsl(var(--border))] px-5 py-4 text-center font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] lg:px-8"><ShieldCheck size={11} className="mr-1.5 inline" />Decision support from public data · not a safety clearance or navigation instruction · follow official IMD / INCOIS warnings</p>
    </div>
  );
}
