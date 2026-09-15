import { type FormEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Activity, BookOpen, Check, ChevronDown, CircleDot, Compass, Database, ExternalLink, FileText, FlaskConical, Github, Info, Layers3, LockKeyhole, Mail, Map, Menu, Network, Route as RouteIcon, Search, ShieldCheck, Users, Waves, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

const navItems = [
  { label: 'The problem', href: '/problem' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Technology', href: '/technology' },
  { label: 'Research', href: '/research' },
];

function Mark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" aria-hidden="true">
      <span className="absolute h-5 w-5 rounded-full border border-[hsl(var(--accent))]" />
      <span className="absolute h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
      <span className="absolute h-8 w-px rotate-45 bg-[hsl(var(--accent))]/60" />
    </span>
  );
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3" data-testid="link-logo">
      <Mark />
      <span className="font-display text-lg font-bold tracking-[-0.04em] text-[hsl(var(--primary))]">ORCA</span>
      <span className="hidden border-l border-[hsl(var(--border))] pl-3 font-mono-ui text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] sm:inline">Ocean reasoning<br />& contextual advisory</span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={`font-mono-ui text-[10px] uppercase tracking-[0.13em] transition-colors hover:text-[hsl(var(--accent))] ${location === item.href ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {item.label}
            </Link>
          ))}
          <Link href="/contact" data-testid="link-header-contact" className="group inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))] px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]">
            Talk to the team <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </nav>
        <button type="button" aria-expanded={open} aria-controls="mobile-navigation" data-testid="button-mobile-menu" onClick={() => setOpen(!open)} className="rounded-md p-2 text-[hsl(var(--primary))] lg:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
          <span className="sr-only">Toggle navigation</span>
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`} className="border-b border-[hsl(var(--border))]/70 py-3 font-mono-ui text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} data-testid="link-mobile-contact" className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--primary-foreground))]">Talk to the team <ArrowUpRight size={13} /></Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
      <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div>
            <div className="flex items-center gap-3"><Mark /><span className="font-display text-xl font-bold">ORCA</span></div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[hsl(var(--primary-foreground))]/65">Ocean Reasoning & Contextual Advisory. An evidence-audited marine decision platform in prototype.</p>
            <p className="mt-8 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--primary-foreground))]/45">SIH 2026 prototype · not an operational service</p>
          </div>
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Explore</p>
            <div className="mt-5 flex flex-col items-start gap-3 text-sm text-[hsl(var(--primary-foreground))]/72">
              <Link href="/how-it-works" data-testid="link-footer-how">How it works</Link>
              <Link href="/data-sources" data-testid="link-footer-data">Data sources</Link>
              <Link href="/methodology" data-testid="link-footer-method">Methodology</Link>
              <Link href="/status" data-testid="link-footer-status">Prototype status</Link>
            </div>
          </div>
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Read the boundary</p>
            <div className="mt-5 flex flex-col items-start gap-3 text-sm text-[hsl(var(--primary-foreground))]/72">
              <Link href="/trust" data-testid="link-footer-trust">Trust & limits</Link>
              <Link href="/security" data-testid="link-footer-security">Security posture</Link>
              <Link href="/privacy" data-testid="link-footer-privacy">Privacy</Link>
              <Link href="/contact" data-testid="link-footer-contact">Contact ORCA</Link>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-[hsl(var(--primary-foreground))]/15 pt-5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary-foreground))]/45 sm:flex-row">
          <span>© 2026 ORCA research team</span>
          <span>Facts first. Assumptions visible. Decisions traceable.</span>
        </div>
      </div>
    </footer>
  );
}

function ButtonLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return (
    <Link href={href} data-testid={`link-cta-${href.replaceAll('/', '') || 'home'}`} className={`group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] transition-all ${secondary ? 'border border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]'}`}>
      {children}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />{children}</span>;
}

function SectionHeading({ eyebrow, title, body, light = false }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <Label>{eyebrow}</Label>
      <h2 className={`mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl ${light ? 'text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--primary))]'}`}>{title}</h2>
      {body && <p className={`mt-5 max-w-xl text-base leading-7 ${light ? 'text-[hsl(var(--primary-foreground))]/65' : 'text-[hsl(var(--muted-foreground))]'}`}>{body}</p>}
    </div>
  );
}

function SignalMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`page-grid relative overflow-hidden rounded-[1.5rem] border border-[hsl(var(--primary))]/20 bg-[#dfece5] ${compact ? 'h-[250px]' : 'h-[500px]'} `} aria-label="Illustrative spatial reasoning map">
      <div className="absolute inset-0 opacity-70 contour-lines" />
      <svg viewBox="0 0 600 500" className="absolute inset-0 h-full w-full" role="img" aria-label="Illustrative map with evidence layers">
        <path d="M-20 356 C 84 303, 94 379, 164 333 S 278 297, 331 326 S 443 396, 620 319" fill="none" stroke="#8bb5a9" strokeWidth="2" />
        <path d="M-20 372 C 81 319, 101 396, 167 350 S 276 314, 335 344 S 444 412, 620 335" fill="none" stroke="#8bb5a9" strokeWidth="1" />
        <path d="M-20 387 C 82 335, 105 410, 172 366 S 275 331, 340 360 S 448 428, 620 350" fill="none" stroke="#8bb5a9" strokeWidth="1" />
        <path d="M45 0 C 117 66, 88 125, 164 179 S 224 263, 198 335" fill="none" stroke="#9fc5bb" strokeWidth="1.5" />
        <path d="M81 0 C 151 72, 124 129, 198 183 S 255 268, 230 346" fill="none" stroke="#9fc5bb" strokeWidth="1" />
        <path d="M430 -10 C 367 81, 411 146, 361 205 S 313 299, 343 381" fill="none" stroke="#9fc5bb" strokeWidth="1.5" />
        <path d="M486 -10 C 426 78, 465 145, 418 203 S 371 292, 398 387" fill="none" stroke="#9fc5bb" strokeWidth="1" />
        <path d="M0 108 C 110 78, 192 124, 289 89 S 441 55, 600 86" fill="none" stroke="#5d9990" strokeWidth="1.5" strokeDasharray="5 7" />
        <path d="M0 115 C 112 86, 192 131, 292 97 S 442 64, 600 94" fill="none" stroke="#5d9990" strokeWidth="1" strokeDasharray="5 7" />
        <path d="M90 426 L 486 82" stroke="#e0715c" strokeWidth="2.5" strokeDasharray="8 7" />
        <circle cx="90" cy="426" r="7" fill="#e0715c" stroke="#f4f5ed" strokeWidth="4" />
        <circle cx="486" cy="82" r="7" fill="#e0715c" stroke="#f4f5ed" strokeWidth="4" />
        <circle cx="325" cy="252" r="18" fill="#f4f5ed" fillOpacity=".8" stroke="#e0715c" strokeWidth="2" />
        <circle cx="325" cy="252" r="4" fill="#e0715c" />
      </svg>
      <div className="absolute left-5 top-5 rounded bg-[hsl(var(--card))]/85 px-3 py-2 backdrop-blur-sm">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">Illustrative analysis view</p>
        <p className="mt-1 text-xs font-semibold text-[hsl(var(--primary))]">Kochi shelf · route window</p>
      </div>
      <div className="absolute bottom-5 left-5 flex gap-4 rounded bg-[hsl(var(--card))]/85 px-3 py-2 text-[9px] backdrop-blur-sm">
        <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><i className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> query points</span>
        <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><i className="h-2 w-2 rounded-full border border-[#5d9990]" /> data layer</span>
      </div>
      <div className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--primary))]/20 bg-[hsl(var(--card))]/70 text-[hsl(var(--primary))]"><Compass size={20} /></div>
    </div>
  );
}

function FlowLine() {
  const steps = [
    { no: '01', title: 'Question', desc: 'A person asks what is changing, where, and what it means for a real decision.', icon: Search },
    { no: '02', title: 'Context', desc: 'The system resolves place, time, units, uncertainty, and the relevant operating frame.', icon: Compass },
    { no: '03', title: 'Spatial reasoning', desc: 'Deterministic calculations join the question to nearby and overlapping ocean layers.', icon: Layers3 },
    { no: '04', title: 'Evidence', desc: 'Every material claim points back to a source, transform, timestamp, or explicit assumption.', icon: FileText },
    { no: '05', title: 'Decision', desc: 'A clear brief shows the finding, caveats, alternatives, and what should be checked next.', icon: ArrowRight },
  ];
  return (
    <div className="relative mt-12">
      <div className="absolute bottom-5 left-[18px] top-5 hidden w-px bg-[hsl(var(--border))] sm:block" />
      <div className="space-y-7">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.no} className="relative grid gap-4 sm:grid-cols-[38px_110px_1fr] sm:items-start">
              <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--accent))] bg-[hsl(var(--background))] text-[hsl(var(--accent))]"><Icon size={15} /></div>
              <span className="pt-2 font-mono-ui text-[10px] tracking-[0.16em] text-[hsl(var(--accent))]">{step.no} / {step.title}</span>
              <p className="max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Home() {
  return (
    <main>
      <section className="page-grid relative overflow-hidden border-b border-[hsl(var(--border))]">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[hsl(var(--secondary))]/50 blur-3xl" />
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 pt-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="relative z-10">
            <div className="reveal"><Label>Ocean intelligence, with a paper trail</Label></div>
            <h1 className="reveal reveal-delay-1 mt-7 max-w-xl font-display text-[clamp(3.4rem,8vw,7rem)] font-semibold leading-[.91] tracking-[-0.07em] text-[hsl(var(--primary))]">Decisions that know <em className="font-normal text-[hsl(var(--accent))]">where</em> they stand.</h1>
            <p className="reveal reveal-delay-2 mt-7 max-w-lg text-lg leading-8 text-[hsl(var(--muted-foreground))]">ORCA turns complex ocean data into understandable, spatially grounded decision support — then shows the work behind every recommendation.</p>
            <div className="reveal reveal-delay-3 mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/how-it-works">Follow the reasoning</ButtonLink>
              <ButtonLink href="/methodology" secondary>Read the method</ButtonLink>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-[hsl(var(--border))] pt-5 font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> Prototype / SIH 2026</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> Synthetic demo data</span>
            </div>
          </div>
          <div className="reveal reveal-delay-2 relative">
            <SignalMap />
            <div className="absolute -bottom-5 right-4 max-w-[230px] rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))] p-4 text-[hsl(var(--primary-foreground))] soft-shadow sm:right-7">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">The distinction</p>
              <p className="mt-2 text-sm leading-5">A chatbot can answer. ORCA can show how the answer was assembled.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:grid-cols-3 lg:px-8">
          {[
            ['01', 'Authoritative data', 'Facts come from named, inspectable sources.'],
            ['02', 'Deterministic software', 'Calculations are repeatable, not improvised.'],
            ['03', 'Evidence in the answer', 'The trail is part of the output, not an appendix.'],
          ].map(([no, title, text]) => (
            <div key={no} className="flex gap-4 border-l border-[hsl(var(--accent))] pl-4">
              <span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">{no}</span>
              <div><h2 className="text-sm font-semibold text-[hsl(var(--primary))]">{title}</h2><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] gap-14 px-5 py-24 lg:grid-cols-[.75fr_1.25fr] lg:px-8 lg:py-32">
        <div>
          <SectionHeading eyebrow="The ORCA loop" title="A recommendation should leave a trail." body="The interface is only the last step. Underneath it is a disciplined handoff between language, context, computation, and evidence." />
          <Link href="/how-it-works" data-testid="link-home-loop" className="group mt-8 inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--primary))]">See the full loop <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></Link>
        </div>
        <FlowLine />
      </section>

      <section className="bg-[hsl(var(--primary))]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-8 lg:py-28">
          <div><Label>Not just a chat window</Label><h2 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-[1.03] tracking-[-0.055em] text-[hsl(var(--primary-foreground))] sm:text-5xl">The ocean is not a paragraph.</h2><p className="mt-6 max-w-md text-base leading-7 text-[hsl(var(--primary-foreground))]/65">It is a set of places, time windows, interacting layers, and decisions with consequences. ORCA keeps those dimensions in view.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Map, title: 'Spatial by design', text: 'Coordinates, regions, buffers, and routes are first-class context.' },
              { icon: Network, title: 'Composed, not guessed', text: 'AI coordinates a workflow; it does not replace the calculation layer.' },
              { icon: ShieldCheck, title: 'Caveats visible', text: 'Unknowns and prototype assumptions stay attached to the finding.' },
              { icon: Activity, title: 'Decision-shaped', text: 'Outputs are briefs, comparisons, and next checks — not just prose.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-[hsl(var(--primary-foreground))]/15 bg-[hsl(var(--primary-foreground))]/[.05] p-5 transition-colors hover:bg-[hsl(var(--primary-foreground))]/[.09]">
                <Icon size={19} className="text-[hsl(var(--accent))]" /><h3 className="mt-5 text-sm font-semibold text-[hsl(var(--primary-foreground))]">{title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--primary-foreground))]/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-24 lg:px-8 lg:py-32">
        <SectionHeading eyebrow="Designed for the edge of the map" title="Useful to people who need context, not spectacle." body="ORCA is being shaped around the way coastal work actually happens: with partial information, local knowledge, changing conditions, and little time to decode a dashboard." />
        <div className="mt-14 grid gap-4 md:grid-cols-[1.1fr_.9fr_.9fr]">
          <Link href="/research" data-testid="card-home-research" className="group relative min-h-[300px] overflow-hidden rounded-2xl bg-[#d6e6dc] p-7 transition-transform hover:-translate-y-1">
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full border border-[#78a99d]/50" /><div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full border border-[#78a99d]/50" />
            <Users size={20} className="text-[hsl(var(--primary))]" /><p className="mt-20 font-mono-ui text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--accent))]">For coastal communities</p><h3 className="mt-3 max-w-xs font-display text-3xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">A clearer view of change.</h3><ArrowUpRight size={18} className="absolute bottom-7 left-7 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
          <Link href="/science" data-testid="card-home-science" className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition-transform hover:-translate-y-1"><FlaskConical size={20} className="text-[hsl(var(--accent))]" /><p className="mt-20 font-mono-ui text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">For researchers</p><h3 className="mt-3 font-display text-3xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">Methods you can interrogate.</h3><ArrowUpRight size={18} className="mt-9 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>
          <Link href="/about" data-testid="card-home-operators" className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-7 transition-transform hover:-translate-y-1"><RouteIcon size={20} className="text-[hsl(var(--primary))]" /><p className="mt-20 font-mono-ui text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">For maritime operators</p><h3 className="mt-3 font-display text-3xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">The route behind the route.</h3><ArrowUpRight size={18} className="mt-9 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>
        </div>
      </section>

      <section className="border-y border-[hsl(var(--border))] bg-[#ebe9df]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div><Label>Prototype boundary</Label><p className="mt-4 max-w-3xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">This public site describes a research prototype. Demonstrations may use synthetic or static examples. ORCA is not a live data service, a navigation system, a safety guarantee, or a substitute for qualified local and regulatory judgment.</p></div>
          <ButtonLink href="/trust" secondary>Know the limits</ButtonLink>
        </div>
      </section>
    </main>
  );
}

function PageIntro({ eyebrow, title, body, number }: { eyebrow: string; title: string; body: string; number?: string }) {
  return (
    <section className="page-grid border-b border-[hsl(var(--border))]">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8 lg:py-24">
        <div className="flex items-start justify-between gap-8"><div><Label>{eyebrow}</Label><h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[.96] tracking-[-0.065em] text-[hsl(var(--primary))] sm:text-7xl">{title}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">{body}</p></div>{number && <span className="hidden font-mono-ui text-[10px] tracking-[0.15em] text-[hsl(var(--accent))] sm:block">{number}</span>}</div>
      </div>
    </section>
  );
}

function SplitBlock({ title, children, reverse = false, icon: Icon = Info }: { title: string; children: ReactNode; reverse?: boolean; icon?: typeof Info }) {
  return (
    <section className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-2 lg:gap-24 lg:px-8 lg:py-28">
      <div className={reverse ? 'lg:order-2' : ''}><Icon size={22} className="text-[hsl(var(--accent))]" /><h2 className="mt-6 max-w-lg font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">{title}</h2></div>
      <div className={`max-w-xl text-[15px] leading-7 text-[hsl(var(--muted-foreground))] ${reverse ? 'lg:order-1' : ''}`}>{children}</div>
    </section>
  );
}

function ProblemPage() {
  return <main><PageIntro eyebrow="01 / The problem" title="Ocean data is abundant. Decision context is not." body="A satellite pass, a current model, a forecast, and a fisher’s observation can all be useful. The hard part is making their relationship understandable before a decision has to be made." number="ORCA / PROBLEM" /><SplitBlock title="The failure mode is not a lack of intelligence." icon={Waves}><p>Most tools make a person assemble the context themselves. They move between maps, PDFs, dashboards, and messages, translating units and time windows while trying to remember which source said what.</p><p className="mt-5">A fluent answer can make this worse if it hides uncertainty or invents a plausible connection. For consequential ocean questions, confidence without a trail is a liability.</p><div className="mt-8 border-l-2 border-[hsl(var(--accent))] pl-5 text-[hsl(var(--primary))]">ORCA treats the reasoning path as part of the product.</div></SplitBlock><section className="bg-[hsl(var(--primary))]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-8"><SectionHeading eyebrow="The difference" title="From fluent answer to inspectable brief." body="The system makes a clean separation between what was retrieved, what was calculated, what was inferred, and what remains unknown." light /><div className="grid gap-3 sm:grid-cols-2"><div className="border-t border-[hsl(var(--accent))] pt-4"><p className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">CHATBOT</p><p className="mt-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]/65">Optimizes for a coherent response. Provenance can be unclear.</p></div><div className="border-t border-[hsl(var(--accent))] pt-4"><p className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">ORCA</p><p className="mt-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]/65">Coordinates tools and sources. The claim, calculation, and caveat stay connected.</p></div></div></div></section><SplitBlock title="The first version is deliberately bounded." icon={ShieldCheck} reverse><p>Our prototype focuses on making the workflow legible, not on pretending to cover every ocean use case. Demonstrations use constrained scenarios and may include synthetic data.</p><p className="mt-5">A future MVP would need source agreements, validated calculations, domain review, operational monitoring, and a clear process for local feedback before it could support real decisions.</p><ButtonLink href="/trust" secondary>Read the boundaries</ButtonLink></SplitBlock></main>;
}

function HowItWorksPage() {
  return <main><PageIntro eyebrow="02 / How it works" title="Question → context → spatial reasoning → evidence → decision." body="ORCA is a coordinator. It routes natural language into a structured workflow, keeps deterministic operations explicit, and returns a decision-shaped brief with its evidence attached." number="ORCA / LOOP" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]"><div><Label>The five handoffs</Label><h2 className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">Every step has a job — and a boundary.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">Language is useful for asking. It is not a substitute for a coordinate transform, a source timestamp, or a reproducible calculation.</p></div><FlowLine /></div></section><section className="bg-[#dbeae2]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"><SignalMap compact /><div><Label>Spatial reasoning</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">Location is not decoration.</h2><p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A route window, a coastal buffer, a habitat polygon, and a point observation imply different operations. ORCA keeps those geometries explicit so a reader can ask: which area, which time, and which layer?</p><div className="mt-7 flex flex-wrap gap-2">{['point / route', 'buffer / region', 'time window', 'units + datum'].map((tag) => <span key={tag} className="rounded-full border border-[hsl(var(--primary))]/20 px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary))]">{tag}</span>)}</div></div></div></div></section><SplitBlock title="The answer is a brief, not a black box." icon={FileText}><p>A useful output might be a comparison of two windows, a map layer with a source note, or a short operational brief. In each case, the reader can distinguish observed data from derived values and assumptions.</p><p className="mt-5">The exact presentation will evolve through research sessions. The non-negotiable is that a material claim must be traceable.</p><ButtonLink href="/methodology" secondary>Inspect the method</ButtonLink></SplitBlock></main>;
}

function TechnologyPage() {
  const layers = [
    ['01', 'Conversation layer', 'Turns a human question into a structured intent: place, time, variables, threshold, and decision frame.', Search],
    ['02', 'Orchestration layer', 'Selects sources and tools, tracks intermediate context, and keeps the workflow legible to the user.', Network],
    ['03', 'Computation layer', 'Runs deterministic transforms and domain calculations that can be tested outside the language model.', Activity],
    ['04', 'Evidence layer', 'Attaches provenance, version, timestamp, uncertainty, and assumptions to the output.', ShieldCheck],
  ] as const;
  return <main><PageIntro eyebrow="03 / Technology" title="AI coordinates the work. It does not get to rewrite the facts." body="The architecture is intentionally plural: language models for coordination, authoritative data for facts, deterministic software for calculations, and evidence for accountability." number="ORCA / STACK" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-4 md:grid-cols-2">{layers.map(([no, title, text, Icon]) => <div key={no} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition-transform hover:-translate-y-1"><div className="flex items-center justify-between"><Icon size={20} className="text-[hsl(var(--accent))]" /><span className="font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))]">{no}</span></div><h2 className="mt-14 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">{title}</h2><p className="mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div></section><section className="border-y border-[hsl(var(--border))] bg-[#ebe9df]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><SectionHeading eyebrow="Design principle" title="No single layer should be trusted to do every job." /><div className="space-y-6 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>The model can be wrong about a source or a relationship. A source can be stale or incomplete. A calculation can be implemented incorrectly. Evidence can be absent. Separating the layers lets each failure be found, tested, and communicated.</p><p className="border-l-2 border-[hsl(var(--accent))] pl-5 text-[hsl(var(--primary))]">This is an architecture proposal for a prototype, not a claim that the full production system is complete.</p></div></div></section><SplitBlock title="Built to become inspectable over time." icon={Database} reverse><p>The intended MVP would expose structured run metadata, source snapshots where permitted, calculation inputs and outputs, and a human-readable evidence view. Interfaces and storage choices remain under research.</p><ButtonLink href="/security" secondary>See the security posture</ButtonLink></SplitBlock></main>;
}

function DataSourcesPage() {
  const sources = [
    ['Earth observation', 'Imagery and derived products can provide broad spatial context. Coverage, latency, processing level, and licensing must be stated per source.', 'source family / to be validated'],
    ['Ocean and weather models', 'Model outputs can describe conditions across a grid, but resolution, forecast horizon, assimilation, and uncertainty matter.', 'source family / to be validated'],
    ['In-situ observations', 'Buoys, vessels, stations, and community reports can ground a view locally, with their own calibration and coverage limits.', 'source family / to be validated'],
    ['Knowledge and methods', 'Peer-reviewed work, technical notes, and domain protocols can inform interpretation without being mistaken for direct observation.', 'source family / to be validated'],
  ];
  return <main><PageIntro eyebrow="04 / Data sources" title="Facts need a name, a timestamp, and a way to be questioned." body="ORCA is designed to work with authoritative and inspectable sources. This prototype names source families rather than claiming live integrations that do not yet exist." number="ORCA / SOURCES" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]"><div className="hidden grid-cols-[.45fr_1.5fr_.8fr] border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-6 py-4 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] sm:grid"><span>Family</span><span>Why it matters</span><span>Prototype status</span></div>{sources.map(([name, desc, status], i) => <div key={name} className="grid gap-3 border-b border-[hsl(var(--border))] px-6 py-6 last:border-b-0 sm:grid-cols-[.45fr_1.5fr_.8fr] sm:gap-6"><div><span className="font-mono-ui text-[9px] text-[hsl(var(--accent))]">0{i + 1}</span><h2 className="mt-2 font-semibold text-[hsl(var(--primary))]">{name}</h2></div><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">{desc}</p><p className="font-mono-ui text-[9px] uppercase leading-5 tracking-[0.1em] text-[hsl(var(--muted-foreground))]">{status}</p></div>)}</div></section><section className="bg-[hsl(var(--primary))]"><div className="mx-auto grid max-w-[1280px] gap-9 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><SectionHeading eyebrow="Source contract" title="If the source cannot be inspected, the claim should be qualified." light /><div className="grid gap-3 sm:grid-cols-2">{['Provenance and attribution', 'Acquisition or observation time', 'Spatial and temporal resolution', 'Processing and transformations', 'Known gaps and uncertainty', 'License and use conditions'].map((item) => <div key={item} className="flex gap-3 border-t border-[hsl(var(--primary-foreground))]/15 pt-3 text-sm text-[hsl(var(--primary-foreground))]/70"><Check size={16} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" />{item}</div>)}</div></div></section></main>;
}

function SciencePage() {
  return <main><PageIntro eyebrow="05 / Science" title="The scientific habit is to show your work." body="ORCA is being shaped as a translation layer between domain knowledge and decisions — careful about what is observed, derived, assumed, and still uncertain." number="ORCA / SCIENCE" /><SplitBlock title="Make uncertainty useful." icon={FlaskConical}><p>Uncertainty is not a footnote to hide when the answer gets difficult. It changes how a recommendation should be read: as a range, a comparison, a prompt for validation, or a reason not to conclude.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-[hsl(var(--secondary))] p-4"><p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Observed</p><p className="mt-2 text-sm text-[hsl(var(--primary))]">What a source reports.</p></div><div className="rounded-lg bg-[hsl(var(--secondary))] p-4"><p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Derived</p><p className="mt-2 text-sm text-[hsl(var(--primary))]">What a stated operation produces.</p></div></div></SplitBlock><section className="border-y border-[hsl(var(--border))] bg-[#dbeae2]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><SectionHeading eyebrow="Research questions" title="We are testing the interface between rigor and use." body="The prototype is an invitation to investigate, not a final theory of marine decision support." /><div className="mt-12 grid gap-3 md:grid-cols-3">{['Can a non-specialist follow a provenance trail without losing the decision?', 'Which spatial abstractions help people reason without overstating precision?', 'How should local knowledge enter a workflow that also uses models and remote sensing?'].map((q, i) => <div key={q} className="border-t-2 border-[hsl(var(--accent))] pt-4"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">QUESTION 0{i + 1}</span><p className="mt-4 text-sm leading-6 text-[hsl(var(--primary))]">{q}</p></div>)}</div></div></section><SplitBlock title="Methods before metrics." icon={BookOpen} reverse><p>Before we publish performance numbers, we need defined tasks, representative data, baselines, and evaluation protocols. We will not fill that gap with impressive-sounding percentages.</p><ButtonLink href="/research" secondary>See the research agenda</ButtonLink></SplitBlock></main>;
}

function TrustPage() {
  return <main><PageIntro eyebrow="06 / Trust & limits" title="Trust is a relationship with the boundary." body="ORCA should earn confidence by making its constraints legible. A polished interface cannot turn a prototype into a certified operational system." number="ORCA / TRUST" /><section className="mx-auto grid max-w-[1280px] gap-4 px-5 py-20 md:grid-cols-2 lg:px-8 lg:py-28"><div className="rounded-2xl bg-[hsl(var(--primary))] p-8 text-[hsl(var(--primary-foreground))]"><ShieldCheck size={22} className="text-[hsl(var(--accent))]" /><h2 className="mt-16 font-display text-3xl font-semibold tracking-[-0.05em]">What we can say now</h2><ul className="mt-6 space-y-4 text-sm leading-6 text-[hsl(var(--primary-foreground))]/65">{['The public experience is a presentation of a SIH 2026 prototype.', 'The reasoning model separates coordination, data, computation, and evidence.', 'Examples may use synthetic or static data and are labeled as such.', 'The team is designing for coastal communities, researchers, and maritime operators.'].map((x) => <li key={x} className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-[hsl(var(--accent))]" />{x}</li>)}</ul></div><div className="rounded-2xl border border-[hsl(var(--border))] p-8"><Info size={22} className="text-[hsl(var(--accent))]" /><h2 className="mt-16 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">What we will not claim</h2><ul className="mt-6 space-y-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{['Official approval or endorsement by ISRO or any other institution.', 'Certification, regulatory compliance, or guaranteed safety.', 'Live coverage, operational accuracy, or complete source integration.', 'A replacement for local expertise, official guidance, or qualified judgment.'].map((x) => <li key={x} className="flex gap-3"><X size={16} className="mt-1 shrink-0 text-[hsl(var(--accent))]" />{x}</li>)}</ul></div></section><SplitBlock title="The right to question the output." icon={Search}><p>We want a reader to be able to ask: Where did this come from? What changed? What did the system calculate? What does it not know? Those are product requirements, not support requests.</p><p className="mt-5">If you see a claim that does not meet that standard, <Link href="/contact" className="text-[hsl(var(--accent))] underline underline-offset-4" data-testid="link-trust-contact">tell us about it.</Link></p></SplitBlock></main>;
}

function SecurityPage() {
  return <main><PageIntro eyebrow="07 / Security" title="A careful posture before a large promise." body="There is no production ORCA service behind this public prototype. The security page describes the principles that would guide a future MVP, not a certification or completed control set." number="ORCA / SECURITY" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: LockKeyhole, title: 'Minimize', text: 'Collect only what a defined workflow needs.' }, { icon: ShieldCheck, title: 'Separate', text: 'Keep identities, source data, and run evidence in clear boundaries.' }, { icon: FileText, title: 'Record', text: 'Maintain a reviewable history of meaningful changes.' }, { icon: Users, title: 'Review', text: 'Make human access and escalation part of the design.' }].map(({ icon: Icon, title, text }) => <div key={title} className="border-t-2 border-[hsl(var(--accent))] pt-5"><Icon size={19} className="text-[hsl(var(--accent))]" /><h2 className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">{title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div></section><section className="bg-[#ebe9df]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><SectionHeading eyebrow="Current state" title="No user accounts. No live data. No operational API." /><div className="text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>This website is a static client-side experience with local content. It does not ask for sensitive information and does not expose a decision service.</p><p className="mt-5">For a future MVP, threat modeling, dependency review, access controls, secrets management, data retention, incident response, and independent review would be required.</p></div></div></section></main>;
}

const legalPages = {
  '/privacy': { eyebrow: '08 / Privacy', title: 'Privacy should be plain language.', body: 'This prototype website is designed to explain ORCA, not to build a profile of its visitors.', heading: 'A small surface with a small data footprint.', paragraphs: ['The public prototype does not require an account, does not ask for precise location, and has no claim to live ocean data access. If you contact the team, the information you choose to send is used to respond to that message and to understand interest in the research.', 'A future ORCA product would need a specific privacy notice covering user accounts, workspace data, source access, retention, deletion, and any analytics. That notice would be written before those features are introduced.'] },
  '/terms': { eyebrow: '09 / Terms', title: 'Use this prototype for understanding, not navigation.', body: 'These plain-language terms describe the current public experience and its limits.', heading: 'A research presentation, not an operational service.', paragraphs: ['The content on this website is informational and part of an SIH 2026 prototype. It may include synthetic, static, incomplete, or illustrative examples. It is not a forecast, a navigation instruction, a safety guarantee, or professional, legal, regulatory, or scientific advice.', 'Do not rely on the website to make time-sensitive decisions at sea or in a coastal operation. Verify relevant conditions with qualified professionals and official sources. The prototype is provided for review and research discussion.'] },
};

function LegalPage({ page }: { page: typeof legalPages['/privacy'] }) {
  return <main><PageIntro eyebrow={page.eyebrow} title={page.title} body={page.body} /><SplitBlock title={page.heading} icon={FileText}><p>{page.paragraphs[0]}</p><p className="mt-5">{page.paragraphs[1]}</p></SplitBlock><section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"><div className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8"><p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Last reviewed · prototype phase</p><p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">Questions about this page or the scope of the prototype can be sent through the contact route. We will update these notes as the project gains real integrations.</p></div></section></main>;
}

function AboutPage() {
  return <main><PageIntro eyebrow="10 / About ORCA" title="A small team asking a large question." body="How might people make better marine decisions when the useful evidence lives across maps, models, measurements, and lived experience?" number="ORCA / ABOUT" /><SplitBlock title="Built as a conversation between disciplines." icon={Users}><p>ORCA brings together software thinking, marine context, human-centered communication, and the practical skepticism of people who know that conditions at sea do not respect the boundaries between datasets.</p><p className="mt-5">The name describes the ambition: Ocean Reasoning & Contextual Advisory. The work is a prototype, and the prototype is a way to make the idea testable.</p></SplitBlock><section className="bg-[#dbeae2]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[1fr_1fr]"><div><Label>Working principles</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">Be specific about the unknown.</h2></div><div className="space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p className="border-t border-[hsl(var(--primary))]/20 pt-4"><strong className="text-[hsl(var(--primary))]">Local before universal.</strong> A global dataset does not erase local expertise.</p><p className="border-t border-[hsl(var(--primary))]/20 pt-4"><strong className="text-[hsl(var(--primary))]">Trace before trust.</strong> A clear path is more valuable than a confident tone.</p><p className="border-t border-[hsl(var(--primary))]/20 pt-4"><strong className="text-[hsl(var(--primary))]">Prototype in public.</strong> Naming what is unfinished is part of the work.</p></div></div></div></section></main>;
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }
  return <main><PageIntro eyebrow="11 / Contact" title="Bring a difficult question." body="We are interested in the real shape of marine decisions: what is asked, what evidence is available, and where current tools leave too much translation to the person." number="ORCA / CONTACT" /><section className="mx-auto grid max-w-[1280px] gap-14 px-5 py-20 lg:grid-cols-[.75fr_1.25fr] lg:px-8 lg:py-28"><div><Label>Research conversations</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">No sales funnel. Just a useful first message.</h2><p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Share a use case, a source family, a critique, or a question about the prototype. The team currently responds manually.</p><div className="mt-9 flex items-center gap-3 text-sm text-[hsl(var(--primary))]"><Mail size={17} className="text-[hsl(var(--accent))]" /> hello@orca-research.example</div><p className="mt-2 pl-8 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">Example address · not monitored yet</p></div><form onSubmit={submit} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">{sent ? <div className="flex min-h-[300px] flex-col justify-center"><CircleDot size={23} className="text-[hsl(var(--accent))]" /><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Message staged.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This prototype does not send email yet, but your message passed the local interaction demo.</p><button type="button" onClick={() => setSent(false)} data-testid="button-contact-reset" className="mt-7 w-fit font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--accent))] underline underline-offset-4">Send another</button></div> : <><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-[hsl(var(--primary))]">Name<input required data-testid="input-contact-name" className="mt-2 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label><label className="text-sm font-medium text-[hsl(var(--primary))]">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-contact-email" className="mt-2 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label></div><label className="mt-5 block text-sm font-medium text-[hsl(var(--primary))]">What are you thinking about?<textarea required data-testid="input-contact-message" rows={6} className="mt-2 w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label><button type="submit" data-testid="button-contact-submit" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]">Stage the message <ArrowUpRight size={14} /></button></>}</form></section></main>;
}

function StatusPage() {
  const [checked, setChecked] = useState('just now');
  return <main><PageIntro eyebrow="12 / Status" title="A clear status for a deliberately small system." body="This page describes the public prototype, not a live operational platform. There are no connected production services behind the ORCA website." number="ORCA / STATUS" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#2f8f72]" /><h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Public prototype</h2></div><button type="button" onClick={() => setChecked('a moment ago')} data-testid="button-status-refresh" className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--accent))]">Refresh check <Activity size={14} /></button></div><div className="grid gap-6 pt-7 sm:grid-cols-3"><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Website</p><p className="mt-2 text-sm text-[#2f8f72]">Operational</p></div><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Decision API</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Not available</p></div><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Last checked</p><p className="mt-2 text-sm text-[hsl(var(--primary))]">{checked}</p></div></div></div></section><section className="bg-[#ebe9df]"><div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8"><p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">If a future MVP introduces connected services, this page will distinguish availability of the website, data access, computation services, and evidence storage instead of flattening them into one green light.</p></div></section></main>;
}

function MethodologyPage() {
  return <main><PageIntro eyebrow="13 / Methodology" title="The method is the product." body="A transparent recommendation is not only a conclusion. It is a compact record of the question, the context, the operation, the evidence, and the remaining uncertainty." number="ORCA / METHOD" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><Label>Evidence card anatomy</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">A reader should be able to replay the reasoning.</h2></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5"><span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Illustrative evidence card</span><span className="rounded-full bg-[hsl(var(--secondary))] px-2 py-1 font-mono-ui text-[9px] text-[hsl(var(--primary))]">DEMO</span></div><h3 className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">A route window overlaps a changing current field.</h3><div className="mt-7 space-y-4">{[['Question frame', 'Route segment · 12–18 Jun · surface current'], ['Operation', 'Spatial overlap + time-window comparison'], ['Evidence', 'Named source family · static example · 2026-02-14'], ['Caveat', 'Synthetic values; not suitable for navigation']].map(([key, value]) => <div key={key} className="grid gap-2 border-t border-[hsl(var(--border))] pt-3 sm:grid-cols-[140px_1fr]"><span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">{key}</span><span className="text-sm text-[hsl(var(--primary))]">{value}</span></div>)}</div></div></div></section><section className="bg-[hsl(var(--primary))]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><SectionHeading eyebrow="Method commitments" title="Specificity over theater." body="The prototype will favor honest labels over false precision as the workflow becomes more capable." light /><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{['Name the source', 'Show the operation', 'Mark the assumption', 'Invite the check'].map((x, i) => <div key={x} className="border-t border-[hsl(var(--accent))] pt-4"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span><p className="mt-5 text-sm text-[hsl(var(--primary-foreground))]/70">{x}</p></div>)}</div></div></section></main>;
}

function ResearchPage() {
  return <main><PageIntro eyebrow="14 / Research" title="A prototype is a question made visible." body="The next phase is not simply to add more data. It is to learn whether an evidence-audited workflow helps real people ask better questions and make better-informed calls." number="ORCA / RESEARCH" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-4 md:grid-cols-[1fr_1fr]"><div className="rounded-2xl bg-[hsl(var(--secondary))] p-8"><Label>Now</Label><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Make the workflow legible.</h2><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Test the language, visual grammar, evidence trail, and boundary statements with skeptical technical readers.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] p-8"><Label>Next</Label><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Make the workflow real.</h2><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Validate source access, calculations, spatial operations, data contracts, and human review with defined tasks.</p></div></div></section><section className="border-y border-[hsl(var(--border))] bg-[#ebe9df]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-8"><SectionHeading eyebrow="A possible MVP path" title="Earn capability one layer at a time." /><div className="space-y-4">{['A narrow set of validated coastal questions', 'A small, versioned source registry', 'Tested spatial and temporal operations', 'Evidence views reviewed with domain experts', 'A measured pilot with clear stop conditions'].map((item, i) => <div key={item} className="flex items-start gap-4 border-b border-[hsl(var(--border))] pb-4"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span><p className="text-sm text-[hsl(var(--primary))]">{item}</p></div>)}</div></div></section><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><SectionHeading eyebrow="Join the critique" title="The best next input is a hard question." body="Tell us what a useful evidence trail would need to show in your domain." /><div className="mt-8"><ButtonLink href="/contact">Start a conversation</ButtonLink></div></div></main>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/problem" component={ProblemPage} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/technology" component={TechnologyPage} />
        <Route path="/data-sources" component={DataSourcesPage} />
        <Route path="/science" component={SciencePage} />
        <Route path="/trust" component={TrustPage} />
        <Route path="/security" component={SecurityPage} />
        <Route path="/privacy"><LegalPage page={legalPages['/privacy']} /></Route>
        <Route path="/terms"><LegalPage page={legalPages['/terms']} /></Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/methodology" component={MethodologyPage} />
        <Route path="/research" component={ResearchPage} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;