// Shared building blocks for the ORCA app. Same design DNA as the public site: paper + teal + coral, Syne display, Space Mono labels.
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export const IST = 'Asia/Kolkata';
export const fmtTime = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toLocaleString('en-IN', { ...opts, timeZone: IST })}${opts.hour ? ' IST' : ''}`;
};
export const fmtDate = (iso?: string | null) => fmtTime(iso, { day: 'numeric', month: 'short', year: 'numeric' });
export const ago = (iso?: string | null) => {
  if (!iso) return '—';
  const h = (Date.now() - new Date(iso.length === 10 ? `${iso}T12:00:00+05:30` : iso).getTime()) / 3.6e6;
  return h < 1 ? 'under 1 h ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />{children}</span>;
}

export function PageHeader({ eyebrow, title, body, actions }: { eyebrow: string; title: string; body?: string; actions?: ReactNode }) {
  return (
    <header className="page-grid border-b border-[hsl(var(--border))]">
      <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-6 px-5 py-8 sm:py-10 lg:flex-row lg:items-end lg:px-8">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1] tracking-[-0.06em] text-[hsl(var(--primary))] sm:text-5xl">{title}</h1>
          {body && <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base sm:leading-7">{body}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export const Page = ({ children }: { children: ReactNode }) => <div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-8 lg:py-10">{children}</div>;

export function Card({ children, className = '', tone = 'card' }: { children: ReactNode; className?: string; tone?: 'card' | 'dark' | 'sand' | 'sea' }) {
  const t = { card: 'border-[hsl(var(--border))] bg-[hsl(var(--card))]', dark: 'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]', sand: 'border-[hsl(var(--border))] bg-[#ebe9df]', sea: 'border-transparent bg-[hsl(var(--secondary))]' }[tone];
  return <section className={`rounded-2xl border p-5 sm:p-6 ${t} ${className}`}>{children}</section>;
}

export const Mono = ({ children, className = '' }: { children: ReactNode; className?: string }) => <p className={`font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] ${className}`}>{children}</p>;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; busy?: boolean; small?: boolean };
export function Btn({ secondary, busy, small, className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button {...rest} disabled={disabled || busy} className={`group inline-flex items-center justify-center gap-2 rounded-full font-mono-ui uppercase tracking-[0.13em] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${small ? 'px-3.5 py-2 text-[9px]' : 'px-5 py-3 text-[10px]'} ${secondary ? 'border border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]'} ${className}`}>
      {busy && <Loader2 size={13} className="animate-spin" />}{children}
    </button>
  );
}

// Risk is always a word + dot, never colour alone.
const RISK: Record<string, { label: string; cls: string }> = {
  SAFE: { label: 'Lower risk', cls: 'border-[hsl(var(--primary))]/30 bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' },
  ok: { label: 'Lower risk', cls: 'border-[hsl(var(--primary))]/30 bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' },
  CAUTION: { label: 'Caution', cls: 'border-[hsl(var(--accent))]/60 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' },
  caution: { label: 'Caution', cls: 'border-[hsl(var(--accent))]/60 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' },
  'HIGH RISK': { label: 'High risk', cls: 'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]' },
  avoid: { label: 'High risk', cls: 'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]' },
  'INSUFFICIENT DATA': { label: 'Insufficient data', cls: 'border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]' },
  unknown: { label: 'No data', cls: 'border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]' },
};
export function RiskBadge({ level, big }: { level: string; big?: boolean }) {
  const r = RISK[level] ?? RISK['unknown']!;
  return <span className={`inline-flex items-center gap-2 rounded-full border font-mono-ui uppercase tracking-[0.1em] ${big ? 'px-3.5 py-1.5 text-[11px]' : 'px-2.5 py-1 text-[9px]'} ${r.cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{r.label}</span>;
}

const STATUS: Record<string, string> = {
  live: 'border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))]',
  recent: 'border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))]',
  derived: 'border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))]',
  historical: 'border-[hsl(var(--secondary-foreground))]/30 text-[hsl(var(--secondary-foreground))]',
  stale: 'border-[hsl(var(--accent))]/50 text-[hsl(var(--accent))]',
  unavailable: 'border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]',
};
export function StatusChip({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[0.1em] ${STATUS[status] ?? STATUS['unavailable']}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

export function Spinner({ label }: { label: string }) {
  return <div role="status" className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]"><Loader2 size={14} className="animate-spin" />{label}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-lg border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/[.07] p-3 text-sm leading-6 text-[hsl(var(--primary))]">{children}</div>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center">
      <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block text-sm font-medium text-[hsl(var(--primary))]">{label}<div className="mt-2">{children}</div></label>;
export const inputCls = 'w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]';
