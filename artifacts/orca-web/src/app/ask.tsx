import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { BookmarkPlus, Check, Copy, Crosshair, Mic, MicOff, Send, Square, X } from 'lucide-react';
import { ApiError, api, streamChat, type Answer, type LonLat, type SavedLocation, type TraceStep } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AnswerBlocks, EvidenceList, GroundingBadge, TraceList } from './blocks';
import { MapView, type LayerToggles } from './mapview';
import { Mono, StatusChip } from './ui';

type Msg = { role: 'user' | 'orca' | 'error'; text: string; answer?: Answer | null };

const SPEECH: Record<string, string> = { English: 'en-IN', Hindi: 'hi-IN', Bengali: 'bn-IN', Odia: 'or-IN', Telugu: 'te-IN', Tamil: 'ta-IN', Malayalam: 'ml-IN', Kannada: 'kn-IN', Marathi: 'mr-IN', Gujarati: 'gu-IN' };
const STARTERS = [
  'Where is the nearest Potential Fishing Zone today near Visakhapatnam?',
  'Is it safe to venture into the sea tomorrow morning near Digha?',
  'What are the tide, weather and sea conditions near Kochi over the next 24 hours?',
  'Are there any lightning or cyclone alerts near Puri?',
  'Which regions show high chlorophyll and favourable SST along the Tamil Nadu coast?',
  'Which fishing zones near Rameswaram should be avoided because of hazards or boundaries?',
  'Why has fish productivity declined near Mangaluru? Compare with last year.',
  'రేపు ఉదయం కాకినాడ దగ్గర సముద్రంలోకి వెళ్లడం సురక్షితమా?',
];

function Prose({ text, onSaveSummary }: { text: string; onSaveSummary?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [lead, ...rest] = text.split(/\n\s*\n/);
  return (
    <div>
      <div className="rounded-xl bg-[hsl(var(--secondary))] p-4">
        <div className="flex items-center justify-between gap-3">
          <Mono className="text-[hsl(var(--accent))]">Summary · short enough for SMS</Mono>
          <button type="button" data-testid="button-copy-summary" onClick={() => { navigator.clipboard?.writeText(lead ?? text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); onSaveSummary?.(); }); }} className="flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <p className="mt-2 font-display text-lg font-medium leading-snug tracking-[-0.02em] text-[hsl(var(--primary))]">{lead}</p>
      </div>
      {rest.map((p, i) => (
        <div key={i} className="mt-3 space-y-1.5 text-sm leading-6 text-[hsl(var(--primary))]">
          {p.split('\n').map((line, j) => /^\s*[-*•]\s+/.test(line) ? <p key={j} className="flex gap-2 pl-1"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--accent))]" />{line.replace(/^\s*[-*•]\s+/, '')}</p> : <p key={j}>{line}</p>)}
        </div>
      ))}
    </div>
  );
}

const key = (s: TraceStep) => `${s.tool}:${JSON.stringify(s.args)}`;

export function AskPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [convId, setConvId] = useState<number | undefined>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<TraceStep[]>([]);
  const [picked, setPicked] = useState<LonLat | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<'insight' | 'evidence' | 'trace'>('insight');
  const [pane, setPane] = useState<'chat' | 'result'>('chat');
  const [mapFull, setMapFull] = useState(false);
  const [toggles, setToggles] = useState<LayerToggles>({ pfz: true, boundaries: true, alerts: false, protected: true });
  const [listening, setListening] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const recog = useRef<{ stop: () => void } | null>(null);

  const locs = useQuery({ queryKey: ['locations'], queryFn: () => api<{ locations: SavedLocation[] }>('/locations') });
  const save = useMutation({
    mutationFn: (b: { name: string; lat: number; lon: number }) => api('/locations', { method: 'POST', body: { ...b, kind: 'harbour' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); qc.invalidateQueries({ queryKey: ['watch'] }); qc.invalidateQueries({ queryKey: ['overview'] }); },
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const answers = useMemo(() => msgs.map((m, i) => (m.answer ? i : -1)).filter((i) => i >= 0), [msgs]);
  const shown = sel !== null && msgs[sel]?.answer ? msgs[sel]!.answer! : (answers.length ? msgs[answers.at(-1)!]!.answer! : null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs.length, live.length, busy]);

  const send = useCallback(async (text: string, at?: LonLat | null) => {
    const message = text.trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setInput(''); setBusy(true); setLive([]); setSel(null); setTab('insight');
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const answer = await streamChat({ message, conversationId: convId, lonlat: at ?? picked ?? undefined }, {
        signal: ctl.signal,
        conversation: setConvId,
        step: (s) => setLive((prev) => {
          if (s.status === 'running') return [...prev, s];
          const i = prev.findLastIndex((p) => key(p) === key(s) && p.status === 'running');
          return i < 0 ? [...prev, s] : prev.map((p, j) => (j === i ? s : p));
        }),
      });
      setMsgs((m) => [...m, { role: 'orca', text: answer.text, answer }]);
      qc.invalidateQueries({ queryKey: ['overview'] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsgs((m) => [...m, { role: 'error', text: e instanceof ApiError ? e.message : 'The request failed before ORCA could answer.' }]);
      else setMsgs((m) => [...m, { role: 'error', text: 'Stopped. The answer was not completed.' }]);
    } finally { setBusy(false); setLive([]); abort.current = null; }
  }, [busy, convId, picked, qc]);

  // open an existing conversation, or a prefilled question from another module
  useEffect(() => {
    if (started.current) return;
    const p = new URLSearchParams(search);
    const c = Number(p.get('c'));
    const q = p.get('q');
    if (!c && !q) return;
    started.current = true;
    if (c) {
      api<{ id: number; messages: Array<{ role: 'user' | 'orca' | 'error'; text: string; answer: Answer | null }> }>(`/conversations/${c}`)
        .then((r) => { setConvId(r.id); setMsgs(r.messages.map((m) => ({ role: m.role, text: m.text, answer: m.answer }))); })
        .catch((e) => setMsgs([{ role: 'error', text: e.message }]));
    } else if (q) {
      const lat = Number(p.get('lat')), lon = Number(p.get('lon'));
      const at: LonLat | null = Number.isFinite(lat) && Number.isFinite(lon) && p.has('lat') ? [lon, lat] : null;
      if (at) setPicked(at);
      setLocation('/app/ask', { replace: true });
      void send(q, at);
    }
  }, [search, send, setLocation]);

  useEffect(() => () => { abort.current?.abort(); recog.current?.stop(); }, []);

  const speechSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const listen = () => {
    if (listening) { recog.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = SPEECH[user?.language ?? 'English'] ?? 'en-IN';
    r.interimResults = true;
    r.onresult = (e: any) => setInput(Array.from(e.results as ArrayLike<any>).map((x) => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recog.current = r; setListening(true); r.start();
  };

  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };
  const savedFirst = locs.data?.locations[0];
  const location0 = (a: Answer) => a.map.layers['location']?.features?.[0] as { properties: { name?: string }; geometry: { coordinates: LonLat } } | undefined;
  const newChat = () => { abort.current?.abort(); setMsgs([]); setConvId(undefined); setSel(null); setPicked(null); };

  return (
    <div className="flex flex-col lg:h-[calc(100vh-82px)] lg:flex-row">
      <div className="flex gap-2 border-b border-[hsl(var(--border))] px-5 py-2 lg:hidden" role="tablist" aria-label="Chat or results">
        {(['chat', 'result'] as const).map((p) => <button key={p} role="tab" aria-selected={pane === p} type="button" onClick={() => setPane(p)} className={`rounded-full px-4 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.13em] ${pane === p ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{p === 'chat' ? 'Conversation' : 'Map & evidence'}</button>)}
      </div>

      {/* conversation */}
      <section className={`${pane === 'chat' ? 'flex' : 'hidden'} min-h-[70vh] flex-1 flex-col border-[hsl(var(--border))] lg:flex lg:min-h-0 lg:max-w-[400px] lg:flex-none lg:basis-[400px] lg:border-r`} aria-label="Conversation with ORCA">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3">
          <div><Mono className="text-[hsl(var(--accent))]">Ask ORCA</Mono><p className="text-xs text-[hsl(var(--muted-foreground))]">Any Indian language · follows up on earlier answers</p></div>
          {msgs.length > 0 && <button type="button" onClick={newChat} data-testid="button-new-chat" className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4">New chat</button>}
        </div>
        <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-5 py-5" aria-live="polite">
          {msgs.length === 0 && !busy && (
            <div>
              <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">What do you need to know about the sea?</h2>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">ORCA plans which live sources to use, fetches them, does the calculations, and shows its work. {savedFirst ? <>Your saved harbour <strong className="text-[hsl(var(--primary))]">{savedFirst.name}</strong> is available as “my harbour”.</> : 'Name a place, or click the map to set your location.'}</p>
              <div className="mt-5 space-y-2">
                {savedFirst && ['Is it safe to fish from my harbour tomorrow morning?', 'Where is the nearest PFZ to my harbour today?'].map((s) => <button key={s} type="button" onClick={() => send(s)} data-testid="starter-saved" className="block w-full rounded-xl border border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/[.06] px-4 py-3 text-left text-sm text-[hsl(var(--primary))] hover:border-[hsl(var(--accent))]">{s}</button>)}
                {STARTERS.map((s) => <button key={s} type="button" onClick={() => send(s)} data-testid="starter" className="block w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-left text-sm text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--accent))]">{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-[hsl(var(--primary))] px-4 py-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]">{m.text}</div>
          ) : m.role === 'error' ? (
            <div key={i} role="alert" className="rounded-xl border border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/[.07] p-4 text-sm leading-6 text-[hsl(var(--primary))]">{m.text}<Mono className="mt-2 normal-case tracking-normal">No values were invented to fill the gap.</Mono></div>
          ) : (
            <div key={i} onClick={() => { setSel(i); setPane('result'); }} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${shown === m.answer ? 'border-[hsl(var(--accent))]/60' : 'border-[hsl(var(--border))]'} bg-[hsl(var(--card))]`}>
              <Prose text={m.text} />
              {m.answer && (
                <div className="mt-3 space-y-3">
                  <GroundingBadge g={m.answer.grounding} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Mono className="normal-case tracking-normal">{m.answer.trace.length} tool calls · {m.answer.evidence.length} sources · {(m.answer.totalMs / 1000).toFixed(0)} s</Mono>
                    <button type="button" className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))] underline underline-offset-4 lg:hidden" onClick={() => setPane('result')}>Open map & evidence</button>
                    {(() => { const f = location0(m.answer); const nm = f?.properties.name; return f && nm && nm !== 'Location' && nm !== 'Start' ? <button type="button" data-testid="button-save-location" onClick={(e) => { e.stopPropagation(); save.mutate({ name: nm, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }, { onSuccess: () => setSaveMsg(`Saved “${nm}” to your watchlist`), onError: (er) => setSaveMsg((er as Error).message) }); }} className="flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]"><BookmarkPlus size={12} />Save “{nm}”</button> : null; })()}
                  </div>
                </div>
              )}
            </div>
          ))}
          {saveMsg && <p role="status" className="text-xs text-[hsl(var(--accent))]">{saveMsg}</p>}
          {busy && (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4" role="status" aria-live="polite">
              <Mono className="text-[hsl(var(--accent))]">ORCA is working · planning and calling live sources</Mono>
              <ol className="mt-3 space-y-2">
                {live.length === 0 && <li className="text-sm text-[hsl(var(--muted-foreground))]">Reading the question and choosing tools…</li>}
                {live.map((s, i) => <li key={i} className="flex items-center justify-between gap-3 text-sm text-[hsl(var(--primary))]"><span><span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--accent))]">{s.agent}</span> · {s.tool}</span><StatusChip status={s.status === 'ok' ? 'live' : s.status === 'failed' ? 'unavailable' : 'derived'} /></li>)}
              </ol>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="border-t border-[hsl(var(--border))] p-4">
          {picked && !busy && (
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Quick actions for the selected map point">
              {['How do I reach here by boat?', 'Is it safe here tomorrow morning?', 'Nearest PFZ from here and a route to it'].map((t) => <button key={t} type="button" onClick={() => void send(t, picked)} data-testid="chip-action" className="rounded-full border border-[hsl(var(--accent))]/60 px-3 py-1.5 text-xs text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--accent))]/10">{t}</button>)}
            </div>
          )}
          {picked && <p className="mb-2 flex items-center gap-2 text-xs text-[hsl(var(--primary))]"><Crosshair size={12} className="text-[hsl(var(--accent))]" />Map location: {picked[1].toFixed(3)}°N, {picked[0].toFixed(3)}°E<button type="button" onClick={() => setPicked(null)} aria-label="Clear map location" className="ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))]"><X size={12} /></button></p>}
          <div className="flex items-end gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }} rows={2} maxLength={1000} placeholder="Ask in English, हिन्दी, తెలుగు, தமிழ், മലയാളം…" aria-label="Your question" data-testid="input-question" className="min-h-[52px] flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" />
            {speechSupported && <button type="button" onClick={listen} aria-pressed={listening} aria-label={listening ? 'Stop voice input' : `Voice input in ${user?.language ?? 'English'}`} data-testid="button-mic" className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl border ${listening ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] text-[hsl(var(--primary))]'}`}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>}
            {busy ? <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" data-testid="button-stop" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Square size={16} /></button>
              : <button type="submit" disabled={!input.trim()} aria-label="Send question" data-testid="button-send" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--accent))] disabled:opacity-40"><Send size={17} /></button>}
          </div>
          <Mono className="mt-2 normal-case tracking-normal">Click the map to set “here”. Model-based screening, not a safety clearance.</Mono>
        </form>
      </section>

      {/* map + results */}
      <section className={`${pane === 'result' ? 'flex' : 'hidden'} min-h-[80vh] min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex lg:min-h-0 lg:overflow-hidden lg:p-4`} aria-label="Map and evidence">
        <MapView className="h-[62vh] shrink-0 lg:h-auto lg:min-h-[320px] lg:flex-1" agent={shown?.map.layers} fit={shown?.map.fit} toggles={toggles} onToggle={(k) => setToggles((t) => ({ ...t, [k]: !t[k] }))} onPick={(p) => setPicked(p)} picked={picked} />
        <div className={`${mapFull ? "lg:hidden" : "lg:flex lg:max-h-[40%] lg:min-h-[180px] lg:flex-col"}`}>
          <div className="flex items-center gap-1 border-b border-[hsl(var(--border))]" role="tablist">
            {([['insight', 'Insight'], ['evidence', `Evidence${shown ? ` (${shown.evidence.length})` : ''}`], ['trace', `Agent trace${shown ? ` (${shown.trace.length})` : ''}`]] as const).map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} data-testid={`tab-${t}`} className={`-mb-px border-b-2 px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.13em] ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]'}`}>{label}</button>
            ))}
            <button type="button" onClick={() => setMapFull(true)} data-testid="button-expand-map" className="ml-auto hidden font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] lg:block">Expand map</button>
          </div>
          <div className="mt-4 pb-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {!shown ? <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">Ask a question. Risk screening, PFZ lists, charts, alerts and routes appear here, with the map showing exactly what the tools found.</p>
              : tab === 'insight' ? (shown.blocks.length ? <AnswerBlocks blocks={shown.blocks} /> : <p className="text-sm text-[hsl(var(--muted-foreground))]">This answer did not need any tool output.</p>)
              : tab === 'evidence' ? <EvidenceList evidence={shown.evidence} /> : <TraceList trace={shown.trace} totalMs={shown.totalMs} model={shown.model} />}
          </div>
        </div>
        {mapFull && <button type="button" onClick={() => setMapFull(false)} data-testid="button-show-results" className="hidden self-end rounded-full bg-[hsl(var(--primary))] px-4 py-2 font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] lg:block">Show results</button>}
      </section>
    </div>
  );
}
