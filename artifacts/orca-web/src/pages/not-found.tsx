import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <main className="page-grid flex min-h-[60vh] items-center justify-center px-5 py-20">
      <div className="w-full max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center sm:p-12">
        <Compass className="mx-auto text-[hsl(var(--accent))]" size={28} aria-hidden="true" />
        <p className="mt-6 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">404 / outside the chart</p>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">This page is not in the current ORCA map.</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">The route may have moved, or it may not be part of the public prototype yet.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--accent))]">
          <ArrowLeft size={14} aria-hidden="true" /> Return to ORCA
        </Link>
      </div>
    </main>
  );
}
