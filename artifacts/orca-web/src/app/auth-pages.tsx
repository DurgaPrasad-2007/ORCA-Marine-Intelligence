import { type FormEvent, useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { ArrowUpRight, Anchor } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Btn, ErrorNote, Eyebrow, Field, inputCls } from './ui';

export const ROLES = ['fisher', 'coastal officer', 'researcher', 'maritime operator'];
export const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Odia', 'Telugu', 'Tamil', 'Malayalam', 'Kannada', 'Marathi', 'Gujarati'];

function AuthLayout({ mode, children }: { mode: 'in' | 'up'; children: React.ReactNode }) {
  const { demo } = useAuth();
  const [, setLocation] = useLocation();
  const next = new URLSearchParams(useSearch()).get('next');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setError(null);
    try { await demo(); setLocation(next?.startsWith('/app') ? next : '/app'); } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <main className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[.9fr_1.1fr]">
      <section className="page-grid relative hidden overflow-hidden bg-[hsl(var(--primary))] lg:block">
        <div className="contour-lines absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-[hsl(var(--primary-foreground))]">
          <Eyebrow>ORCA workspace</Eyebrow>
          <div>
            <h1 className="font-display text-6xl font-semibold leading-[.95] tracking-[-0.065em]">Ask the ocean. <em className="font-normal text-[hsl(var(--accent))]">Inspect</em> the answer.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[hsl(var(--primary-foreground))]/65">Live PFZ advisories, official alerts, forecasts and satellite data, reasoned over by an agent that shows every source and every step.</p>
          </div>
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--primary-foreground))]/45">Facts first. Assumptions visible. Decisions traceable.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[440px]">
          {children}
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-6">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Reviewing this prototype?</p>
            <Btn type="button" secondary busy={busy} onClick={go} className="mt-3 w-full" data-testid="button-guest-access">Continue as guest reviewer <ArrowUpRight size={14} /></Btn>
            <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">One click, no email. A real account of its own: saved locations and history persist.</p>
            {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          </div>
          <p className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">{mode === 'in' ? <>New to ORCA? <Link href="/sign-up" className="text-[hsl(var(--accent))] underline underline-offset-4" data-testid="link-to-sign-up">Create an account</Link></> : <>Already have an account? <Link href="/sign-in" className="text-[hsl(var(--accent))] underline underline-offset-4" data-testid="link-to-sign-in">Sign in</Link></>}</p>
        </div>
      </section>
    </main>
  );
}

export function SignInPage() {
  const { user, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const next = new URLSearchParams(useSearch()).get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (user) return <Redirect to={next?.startsWith('/app') ? next : '/app'} />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await signIn(email, password); setLocation(next?.startsWith('/app') ? next : '/app'); } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <AuthLayout mode="in">
      <Anchor size={22} className="text-[hsl(var(--accent))]" />
      <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Welcome back</h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Sign in to your ORCA workspace.</p>
      <form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <Field label="Email"><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} data-testid="input-email" /></Field>
        <Field label="Password"><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} data-testid="input-password" /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Btn type="submit" busy={busy} className="w-full" data-testid="button-sign-in">Sign in <ArrowUpRight size={14} /></Btn>
      </form>
    </AuthLayout>
  );
}

export function SignUpPage() {
  const { user, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'fisher', language: 'English' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (user) return <Redirect to="/app" />;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await signUp(f); setLocation('/app'); } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <AuthLayout mode="up">
      <Anchor size={22} className="text-[hsl(var(--accent))]" />
      <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Create your account</h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Save your harbours, watch conditions, and keep your conversations.</p>
      <form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <Field label="Name"><input required minLength={2} autoComplete="name" value={f.name} onChange={set('name')} className={inputCls} data-testid="input-name" /></Field>
        <Field label="Email"><input required type="email" autoComplete="email" value={f.email} onChange={set('email')} className={inputCls} data-testid="input-email" /></Field>
        <Field label="Password (8+ characters)"><input required type="password" minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} className={inputCls} data-testid="input-password" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="I am a"><select value={f.role} onChange={set('role')} className={inputCls} data-testid="select-role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Preferred language"><select value={f.language} onChange={set('language')} className={inputCls} data-testid="select-language">{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></Field>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Btn type="submit" busy={busy} className="w-full" data-testid="button-sign-up">Create account <ArrowUpRight size={14} /></Btn>
      </form>
    </AuthLayout>
  );
}
