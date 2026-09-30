import { type FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Btn, ErrorNote, Spinner, inputCls } from './ui';

export type Place = { name: string; admin: string; coastal?: boolean; lat: number; lon: number };

/** Live place search (GeoNames). Selecting a result calls onPick; nothing is guessed. */
export function PlaceSearch({ onPick, label = 'Search a harbour, town or district', cta }: { onPick: (p: Place) => void; label?: string; cta?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const search = useMutation({ mutationFn: (term: string) => api<{ matches: Place[] }>(`/geocode?q=${encodeURIComponent(term)}`), onSuccess: (r) => setResults(r.matches) });
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim().length >= 2) search.mutate(q.trim()); };
  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={label} aria-label={label} className={inputCls} data-testid="input-place-search" />
        <Btn type="submit" busy={search.isPending} aria-label="Search places" data-testid="button-place-search"><Search size={14} />{cta ?? 'Search'}</Btn>
      </form>
      {search.isError && <div className="mt-3"><ErrorNote>{(search.error as Error).message}. The place search service may be unavailable; try again shortly.</ErrorNote></div>}
      {search.isPending && <div className="mt-3"><Spinner label="Searching" /></div>}
      {results && !search.isPending && (results.length === 0
        ? <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">No place with that name in India. Try the English spelling.</p>
        : <ul className="mt-3 divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}><button type="button" onClick={() => { onPick(r); setResults(null); setQ(''); }} data-testid="place-result" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--secondary))]"><MapPin size={15} className="shrink-0 text-[hsl(var(--accent))]" /><span><span className="block text-sm font-medium text-[hsl(var(--primary))]">{r.name}</span><span className="block font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">{r.admin} · {r.lat.toFixed(3)}°N {r.lon.toFixed(3)}°E{r.coastal === false ? ' · inland state' : ''}</span></span></button></li>
          ))}
        </ul>)}
    </div>
  );
}

export function useAddLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name: string; lat: number; lon: number; kind?: string }) => api('/locations', { method: 'POST', body: { kind: 'harbour', ...b } }),
    onSuccess: () => { for (const k of ['locations', 'watch', 'overview']) qc.invalidateQueries({ queryKey: [k] }); },
  });
}
