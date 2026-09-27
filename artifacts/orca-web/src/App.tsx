import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Activity, AlertTriangle, BookOpen, Check, ChevronDown, CircleDot, Clipboard, Compass, Database, ExternalLink, FileText, FlaskConical, Github, Info, Layers3, LockKeyhole, Mail, Map, Menu, Network, Route as RouteIcon, Search, ShieldCheck, SlidersHorizontal, Users, Waves, X } from 'lucide-react';
import { useRunDighaDecisionDemo, type DecisionDemoResult } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();
const CONTACT_EMAIL = 'polojudurgaprasad@gmail.com';
const SECURITY_EMAIL = 'polojudurgaprasad@gmail.com';
const PRIVACY_OWNER = 'Karma Coder';

const navItems = [
  { label: 'The problem', href: '/problem' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Technology', href: '/technology' },
  { label: 'Research', href: '/research' },
];

const pageMeta: Record<string, { title: string; description: string; type?: string }> = {
  '/': {
    title: 'ORCA | Evidence-audited marine decision intelligence',
    description: 'ORCA turns complex ocean data into spatially grounded decision support with visible evidence, deterministic analysis, and honest uncertainty.',
    type: 'SoftwareApplication',
  },
  '/problem': {
    title: 'The marine decision problem | ORCA',
    description: 'Why marine decisions need more than disconnected maps, forecasts, and fluent answers: ORCA keeps place, time, evidence, and uncertainty connected.',
  },
  '/how-it-works': {
    title: 'How ORCA works | Marine reasoning with a paper trail',
    description: 'See how ORCA moves from a natural-language question to context, spatial reasoning, evidence, and a decision-shaped brief.',
  },
  '/demo/digha': {
    title: 'Digha decision demonstration | ORCA',
    description: 'Inspect the ORCA evidence-first workflow for a Digha fishing question using clearly labeled synthetic fixtures and explicit uncertainty.',
  },
  '/technology': {
    title: 'ORCA technology | AI coordination and deterministic analysis',
    description: 'ORCA separates language-model coordination from authoritative data, deterministic computation, and evidence so each layer can be inspected.',
  },
  '/data-sources': {
    title: 'Marine data sources | ORCA',
    description: 'Understand the source families ORCA is designed to work with, including earth observation, models, in-situ observations, and domain knowledge.',
  },
  '/science': {
    title: 'Marine science and uncertainty | ORCA',
    description: 'Explore how ORCA distinguishes observed, derived, assumed, and uncertain information in marine decision support.',
  },
  '/trust': {
    title: 'Trust and limits | ORCA',
    description: 'What ORCA can say, what it cannot claim, and why evidence, caveats, and human judgement remain part of the product.',
  },
  '/security': {
    title: 'Security posture | ORCA',
    description: 'The security principles and current boundaries of the ORCA public prototype, with no live user accounts or operational decision service behind it.',
  },
  '/privacy': {
    title: 'Privacy notice | ORCA',
    description: 'A plain-language privacy notice for the ORCA public prototype and its intentionally small data footprint.',
  },
  '/terms': {
    title: 'Terms and limitations | ORCA',
    description: 'Plain-language terms for using the ORCA public prototype for research discussion, not navigation or safety decisions.',
  },
  '/cookies': {
    title: 'Cookie notice | ORCA',
    description: 'How the ORCA public prototype handles cookies, local browser state, and future preference controls.',
  },
  '/acceptable-use': {
    title: 'Acceptable use | ORCA',
    description: 'The intended and out-of-scope uses of the ORCA public prototype and future decision-support service.',
  },
  '/ai-transparency': {
    title: 'AI transparency | ORCA',
    description: 'How ORCA is designed to use AI for interpretation and explanation while keeping data, calculations, and evidence explicit.',
  },
  '/accessibility': {
    title: 'Accessibility statement | ORCA',
    description: 'ORCA’s accessibility goals, current public-site support, known limitations, and contact route for barriers.',
  },
  '/vulnerability-disclosure': {
    title: 'Vulnerability disclosure | ORCA',
    description: 'How to report a suspected security issue in the ORCA public prototype responsibly.',
  },
  '/data-retention': {
    title: 'Data retention | ORCA',
    description: 'The current retention position for the ORCA public prototype and the controls required before a data service launches.',
  },
  '/data-deletion': {
    title: 'Data deletion | ORCA',
    description: 'What deletion means for the current ORCA public prototype and how future account data would need to be handled.',
  },
  '/subprocessors': {
    title: 'Subprocessors and providers | ORCA',
    description: 'The current third-party processing position for ORCA and the disclosure expected before connected services are introduced.',
  },
  '/third-party-licenses': {
    title: 'Third-party licenses | ORCA',
    description: 'License and attribution information for the software used in the ORCA public prototype.',
  },
  '/about': {
    title: 'About ORCA | Ocean Reasoning & Contextual Advisory',
    description: 'Meet the research direction behind ORCA, a prototype for evidence-audited marine decision support.',
  },
  '/contact': {
    title: 'Contact ORCA | Marine decision intelligence research',
    description: 'Share a marine use case, source question, critique, or research idea with the ORCA team.',
  },
  '/status': {
    title: 'Prototype status | ORCA',
    description: 'See what is and is not connected behind the ORCA public prototype.',
  },
  '/methodology': {
    title: 'ORCA methodology | Evidence, assumptions, and decisions',
    description: 'The ORCA methodology connects a question to an operation, source, timestamp, caveat, and decision contribution.',
  },
  '/research': {
    title: 'ORCA research agenda | Marine decision support',
    description: 'The research questions guiding ORCA: making marine reasoning legible, spatially grounded, and useful without overstating precision.',
  },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function PageMeta() {
  const [location] = useLocation();

  useEffect(() => {
    const meta = pageMeta[location] ?? {
      title: 'Page not found | ORCA',
      description: 'The requested ORCA page could not be found.',
    };
    const canonical = new URL(location, window.location.origin).toString();
    const isNotFound = !pageMeta[location];

    document.title = meta.title;
    document.documentElement.lang = 'en';
    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', isNotFound ? 'noindex, follow' : 'index, follow');
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:site_name', 'ORCA');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:card', 'summary');

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    const existingSchema = document.head.querySelector<HTMLScriptElement>('#orca-structured-data');
    existingSchema?.remove();
    if (meta.type) {
      const schema = document.createElement('script');
      schema.id = 'orca-structured-data';
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': meta.type,
        name: 'ORCA — Ocean Reasoning & Contextual Advisory',
        applicationCategory: 'DecisionSupportSystem',
        description: meta.description,
        url: canonical,
        isAccessibleForFree: true,
        inLanguage: 'en',
      });
      document.head.appendChild(schema);
    }
  }, [location]);

  return null;
}

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
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[hsl(var(--primary))] focus:px-4 focus:py-3 focus:text-sm focus:text-[hsl(var(--primary-foreground))]">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} aria-current={location === item.href ? 'page' : undefined} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={`font-mono-ui text-[10px] uppercase tracking-[0.13em] transition-colors hover:text-[hsl(var(--accent))] ${location === item.href ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
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
              <Link key={item.href} href={item.href} aria-current={location === item.href ? 'page' : undefined} onClick={() => setOpen(false)} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`} className="border-b border-[hsl(var(--border))]/70 py-3 font-mono-ui text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} data-testid="link-mobile-contact" className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--primary-foreground))]">Talk to the team <ArrowUpRight size={13} /></Link>
          </div>
        </nav>
      )}
      </header>
    </>
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
              <Link href="/cookies" data-testid="link-footer-cookies">Cookies</Link>
              <Link href="/accessibility" data-testid="link-footer-accessibility">Accessibility</Link>
              <Link href="/ai-transparency" data-testid="link-footer-ai-transparency">AI transparency</Link>
              <Link href="/contact" data-testid="link-footer-contact">Contact ORCA</Link>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-[hsl(var(--primary-foreground))]/15 pt-5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary-foreground))]/45 sm:flex-row">
          <span>© 2026 ORCA research team · <Link href="/terms" className="underline underline-offset-4">Terms</Link></span>
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
             <Link href="/demo/digha" data-testid="link-home-digha-demo" className="mt-5 inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--accent))] transition-colors hover:text-[hsl(var(--primary))]">Open the Digha decision demo <ArrowRight size={14} /></Link>
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
  return <main><PageIntro eyebrow="02 / How it works" title="Question → context → spatial reasoning → evidence → decision." body="ORCA is a coordinator. It routes natural language into a structured workflow, keeps deterministic operations explicit, and returns a decision-shaped brief with its evidence attached." number="ORCA / LOOP" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]"><div><Label>The five handoffs</Label><h2 className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">Every step has a job — and a boundary.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">Language is useful for asking. It is not a substitute for a coordinate transform, a source timestamp, or a reproducible calculation.</p><div className="mt-7"><ButtonLink href="/demo/digha">Open the Digha decision demo</ButtonLink></div></div><FlowLine /></div></section><section className="bg-[#dbeae2]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"><SignalMap compact /><div><Label>Spatial reasoning</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">Location is not decoration.</h2><p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A route window, a coastal buffer, a habitat polygon, and a point observation imply different operations. ORCA keeps those geometries explicit so a reader can ask: which area, which time, and which layer?</p><div className="mt-7 flex flex-wrap gap-2">{['point / route', 'buffer / region', 'time window', 'units + datum'].map((tag) => <span key={tag} className="rounded-full border border-[hsl(var(--primary))]/20 px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--primary))]">{tag}</span>)}</div></div></div></div></section><SplitBlock title="The answer is a brief, not a black box." icon={FileText}><p>A useful output might be a comparison of two windows, a map layer with a source note, or a short operational brief. In each case, the reader can distinguish observed data from derived values and assumptions.</p><p className="mt-5">The exact presentation will evolve through research sessions. The non-negotiable is that a material claim must be traceable.</p><ButtonLink href="/methodology" secondary>Inspect the method</ButtonLink></SplitBlock></main>;
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
  return <main><PageIntro eyebrow="07 / Security" title="A careful posture before a large promise." body="There is no production ORCA service behind this public prototype. The security page describes the principles that would guide a future MVP, not a certification or completed control set." number="ORCA / SECURITY" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: LockKeyhole, title: 'Minimize', text: 'Collect only what a defined workflow needs.' }, { icon: ShieldCheck, title: 'Separate', text: 'Keep identities, source data, and run evidence in clear boundaries.' }, { icon: FileText, title: 'Record', text: 'Maintain a reviewable history of meaningful changes.' }, { icon: Users, title: 'Review', text: 'Make human access and escalation part of the design.' }].map(({ icon: Icon, title, text }) => <div key={title} className="border-t-2 border-[hsl(var(--accent))] pt-5"><Icon size={19} className="text-[hsl(var(--accent))]" /><h2 className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">{title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div></section><section className="bg-[#ebe9df]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><SectionHeading eyebrow="Current state" title="No user accounts. No live data. Demo-only decision endpoint." /><div className="text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>This website includes a deterministic Digha fixture endpoint for product demonstration. It does not ask for sensitive information, connect to live marine providers, or expose an operational decision service.</p><p className="mt-5">For a future MVP, threat modeling, dependency review, access controls, secrets management, data retention, incident response, and independent review would be required.</p><p className="mt-5">To report a suspected security issue in this public prototype, email <a href={`mailto:${SECURITY_EMAIL}`} className="text-[hsl(var(--primary))] underline underline-offset-4">{SECURITY_EMAIL}</a>. Please do not include secrets or personal data.</p></div></div></section></main>;
}

const legalPages = {
  '/privacy': { eyebrow: '08 / Privacy', title: 'Privacy should be plain language.', body: 'This prototype website is designed to explain ORCA, not to build a profile of its visitors.', heading: 'A small surface with a small data footprint.', paragraphs: ['The public prototype does not require an account, does not ask for precise location, and has no claim to live ocean data access. If you contact the team, the information you choose to send is used to respond to that message and to understand interest in the research.', `Privacy and grievance concerns can be sent to ${CONTACT_EMAIL}. The privacy owner is ${PRIVACY_OWNER}; the team aims to acknowledge messages within 5 business days, although complex matters may take longer.`, 'A future ORCA product would need a specific privacy notice covering user accounts, workspace data, source access, retention, deletion, and any analytics. That notice would be written before those features are introduced.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/terms': { eyebrow: '09 / Terms', title: 'Use this prototype for understanding, not navigation.', body: 'These plain-language terms describe the current public experience and its limits.', heading: 'A research presentation, not an operational service.', paragraphs: ['The content on this website is informational and part of an SIH 2026 prototype. It may include synthetic, static, incomplete, or illustrative examples. It is not a forecast, a navigation instruction, a safety guarantee, or professional, legal, regulatory, or scientific advice.', 'Do not rely on the website to make time-sensitive decisions at sea or in a coastal operation. Verify relevant conditions with qualified professionals and official sources. The prototype is provided for review and research discussion.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/cookies': { eyebrow: '09A / Cookies', title: 'A small cookie surface.', body: 'The current public prototype does not use advertising or analytics cookies.', heading: 'No preference wall for a static prototype.', paragraphs: ['The website may use browser capabilities needed for normal navigation, but it does not currently require an account, advertising identifier, or cross-site tracking cookie. The mobile navigation does not persist a profile or location history.', 'If analytics, embedded media, or preference storage is introduced, the site will explain the purpose, provider, retention, and available choices before those tools are enabled.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/acceptable-use': { eyebrow: '09B / Acceptable use', title: 'Use ORCA to question the workflow.', body: 'The prototype is for research, critique, and product discussion.', heading: 'Keep consequential decisions with qualified people.', paragraphs: ['You may use the public site to understand the ORCA concept, discuss marine decision-support workflows, and identify questions for research. Do not represent the prototype as an official government, ISRO, maritime-authority, warning, or navigation service.', 'Do not use illustrative content or synthetic examples to make safety-critical decisions, mislead others about source authority, probe systems you do not own, or submit personal information that the current prototype does not need.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/ai-transparency': { eyebrow: '09C / AI transparency', title: 'AI should explain the work, not invent the evidence.', body: 'ORCA is designed around a visible boundary between language assistance and deterministic analysis.', heading: 'A model is one layer in the workflow.', paragraphs: ['A future ORCA system may use AI to interpret natural-language questions, extract context, coordinate tools, summarize validated evidence, and translate explanations. It should not invent measurements, coordinates, source freshness, warnings, distances, geometry, or risk scores.', 'The public website contains no connected decision model or live marine retrieval. Any future deployment would need documented intended use, evaluation, human oversight, incident handling, and a way to inspect evidence without exposing hidden prompts or chain-of-thought.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/accessibility': { eyebrow: '09D / Accessibility', title: 'A decision-support idea should be readable by the people judging it.', body: 'ORCA aims to follow WCAG 2.2 AA practices across its public experience.', heading: 'Access is part of product quality.', paragraphs: ['The public site uses semantic landmarks, keyboard-visible focus, labeled controls, responsive layouts, non-colour status cues, readable contrast, and reduced-motion support. The content is written to be understandable without access to a map or a live dashboard.', 'This prototype has not been independently certified. If a page, interaction, or document creates a barrier, please describe what happened through the contact route so it can be reviewed.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/vulnerability-disclosure': { eyebrow: '09E / Vulnerability disclosure', title: 'A safe route for reporting security concerns.', body: 'The current ORCA site is a public prototype with no accounts, sensitive data store, or live decision API.', heading: 'Please report suspected vulnerabilities responsibly.', paragraphs: ['Do not attempt to access another person’s data, disrupt availability, or test third-party systems through the public site. Preserve only the minimum evidence needed to explain the issue and avoid sending secrets or personal data.', `Email suspected vulnerabilities to ${SECURITY_EMAIL}. This mailbox is monitored by the ORCA research team; please include a concise description, affected page or component, reproduction steps, and impact without sending secrets. We aim to acknowledge reports within 5 business days.`, 'The team will assess reports in good faith and coordinate a safe resolution. Supported versions and a formal safe-harbour policy will be published before a connected ORCA service launches.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/data-retention': { eyebrow: '09F / Data retention', title: 'Retention should follow a purpose.', body: 'The public prototype does not operate an account, query-history, or evidence-storage service.', heading: 'There is no hidden marine history behind this page.', paragraphs: ['The current site does not intentionally retain precise location history, vessel telemetry, query history, or user profiles. A future product would define retention by data class, document source-provider requirements, and provide deletion and export paths where applicable.', 'Retention periods should be reviewed for jurisdiction, purpose, security, source licensing, and operational need instead of using one universal duration.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/data-deletion': { eyebrow: '09G / Data deletion', title: 'Deletion should be a real workflow, not a promise.', body: 'The current public prototype has no user account or stored query workspace to delete.', heading: 'Future deletion controls belong in the product.', paragraphs: ['Because the public site does not create accounts or store a user workspace, there is no current self-service deletion action. If you contact the team, only the information needed to handle that message should be retained for an identified purpose.', 'Before a future account-based product launches, deletion should cover user records, saved analyses, location history, exports, caches, backups, and connected processors according to documented exceptions and legal requirements.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/subprocessors': { eyebrow: '09H / Providers', title: 'No undisclosed processing chain.', body: 'The public prototype does not currently connect to marine providers, analytics vendors, or an AI API.', heading: 'Connected services will be disclosed before they matter.', paragraphs: ['This site presents local content and illustrative diagrams. It does not claim live INCOIS, IMD, ISRO, satellite, mapping, payment, or AI-provider integrations. Source families on the data page are design targets, not current retrievals.', 'If a future service processes personal data or query content through a provider, the provider, purpose, region, data categories, retention, and contractual role should be documented here or in an accompanying processing notice.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
  '/third-party-licenses': { eyebrow: '09I / Licenses', title: 'Attribution belongs in the product.', body: 'The public prototype uses open-source software and should preserve the licenses that make it possible.', heading: 'A short notice for a small prototype.', paragraphs: ['The application is built with open-source web tooling, including React, Vite, Tailwind CSS, Wouter, Lucide icons, and related dependencies. Their respective license texts and notices remain authoritative and should be included in a release inventory before distribution.', 'This page is a product-level summary, not a replacement for the generated dependency license inventory. No proprietary marine-provider code or data is claimed here.'], version: '0.1', effective: '17 September 2026', scope: 'Public prototype website' },
};

function LegalPage({ page }: { page: (typeof legalPages)[keyof typeof legalPages] }) {
  return <main><PageIntro eyebrow={page.eyebrow} title={page.title} body={page.body} /><SplitBlock title={page.heading} icon={FileText}><p>{page.paragraphs[0]}</p><p className="mt-5">{page.paragraphs[1]}</p></SplitBlock><section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"><div className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8"><div className="grid gap-4 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:grid-cols-3"><span>Version · {page.version}</span><span>Effective · {page.effective}</span><span>Scope · {page.scope}</span></div><p className="mt-6 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">Last updated 17 September 2026. Questions about this page or the scope of the prototype can be sent through the <Link href="/contact" className="text-[hsl(var(--accent))] underline underline-offset-4">contact route</Link>. These notes will be revised as the project gains real integrations.</p></div></section></main>;
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
  return <main><PageIntro eyebrow="11 / Contact" title="Bring a difficult question." body="We are interested in the real shape of marine decisions: what is asked, what evidence is available, and where current tools leave too much translation to the person." number="ORCA / CONTACT" /><section className="mx-auto grid max-w-[1280px] gap-14 px-5 py-20 lg:grid-cols-[.75fr_1.25fr] lg:px-8 lg:py-28"><div><Label>Research conversations</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--primary))]">No sales funnel. Just a useful first message.</h2><p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Share a use case, a source family, a critique, or a question about the prototype. The ORCA research team monitors this inbox and aims to respond within 5 business days.</p><a href={`mailto:${CONTACT_EMAIL}`} className="mt-9 flex w-fit items-center gap-3 text-sm text-[hsl(var(--primary))] underline underline-offset-4"><Mail size={17} className="text-[hsl(var(--accent))]" /> {CONTACT_EMAIL}</a><p className="mt-2 pl-8 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">Monitored research contact</p></div><form onSubmit={submit} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><p className="mb-6 rounded-lg bg-[hsl(var(--secondary))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">This form prepares a local draft only. To send a message, use the monitored email address or your own email client.</p>{sent ? <div className="flex min-h-[260px] flex-col justify-center"><CircleDot size={23} className="text-[hsl(var(--accent))]" /><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Nothing was sent.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The form interaction completed locally. No message was transmitted or saved.</p><button type="button" onClick={() => setSent(false)} data-testid="button-contact-reset" className="mt-7 w-fit font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--accent))] underline underline-offset-4">Clear the draft</button></div> : <><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-[hsl(var(--primary))]">Name<input required data-testid="input-contact-name" className="mt-2 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label><label className="text-sm font-medium text-[hsl(var(--primary))]">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-contact-email" className="mt-2 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label></div><label className="mt-5 block text-sm font-medium text-[hsl(var(--primary))]">What are you thinking about?<textarea required data-testid="input-contact-message" rows={6} className="mt-2 w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm outline-none transition-colors focus:border-[hsl(var(--accent))]" /></label><button type="submit" data-testid="button-contact-submit" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]">Review local draft <ArrowUpRight size={14} /></button></>}</form></section></main>;
}

function StatusPage() {
  return <main><PageIntro eyebrow="12 / Status" title="A clear status for a deliberately small system." body="This page describes the public prototype, not a live operational platform. There are no connected production services behind the ORCA website." number="ORCA / STATUS" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-6"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" /><h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">Public prototype · available</h2></div><div className="grid gap-6 pt-7 sm:grid-cols-3"><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Website</p><p className="mt-2 text-sm text-[hsl(var(--primary))]">Static public experience</p></div><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Decision API</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Not connected</p></div><div><p className="font-mono-ui text-[9px] uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">Marine providers</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Not connected</p></div></div></div></section><section className="bg-[#ebe9df]"><div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8"><p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">If a future MVP introduces connected services, this page will report their actual availability, freshness, and failure state. It will not flatten unavailable providers into a green light.</p></div></section></main>;
}

function MethodologyPage() {
  return <main><PageIntro eyebrow="13 / Methodology" title="The method is the product." body="A transparent recommendation is not only a conclusion. It is a compact record of the question, the context, the operation, the evidence, and the remaining uncertainty." number="ORCA / METHOD" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><Label>Evidence card anatomy</Label><h2 className="mt-5 font-display text-4xl font-semibold leading-none tracking-[-0.05em] text-[hsl(var(--primary))]">A reader should be able to replay the reasoning.</h2></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5"><span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Illustrative evidence card</span><span className="rounded-full bg-[hsl(var(--secondary))] px-2 py-1 font-mono-ui text-[9px] text-[hsl(var(--primary))]">DEMO</span></div><h3 className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em] text-[hsl(var(--primary))]">A route window overlaps a changing current field.</h3><div className="mt-7 space-y-4">{[['Question frame', 'Route segment · 12–18 Jun · surface current'], ['Operation', 'Spatial overlap + time-window comparison'], ['Evidence', 'Named source family · static example · 2026-02-14'], ['Caveat', 'Synthetic values; not suitable for navigation']].map(([key, value]) => <div key={key} className="grid gap-2 border-t border-[hsl(var(--border))] pt-3 sm:grid-cols-[140px_1fr]"><span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">{key}</span><span className="text-sm text-[hsl(var(--primary))]">{value}</span></div>)}</div></div></div></section><section className="bg-[hsl(var(--primary))]"><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><SectionHeading eyebrow="Method commitments" title="Specificity over theater." body="The prototype will favor honest labels over false precision as the workflow becomes more capable." light /><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{['Name the source', 'Show the operation', 'Mark the assumption', 'Invite the check'].map((x, i) => <div key={x} className="border-t border-[hsl(var(--accent))] pt-4"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span><p className="mt-5 text-sm text-[hsl(var(--primary-foreground))]/70">{x}</p></div>)}</div></div></section></main>;
}

function ResearchPage() {
  return <main><PageIntro eyebrow="14 / Research" title="A prototype is a question made visible." body="The next phase is not simply to add more data. It is to learn whether an evidence-audited workflow helps real people ask better questions and make better-informed calls." number="ORCA / RESEARCH" /><section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-4 md:grid-cols-[1fr_1fr]"><div className="rounded-2xl bg-[hsl(var(--secondary))] p-8"><Label>Now</Label><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Make the workflow legible.</h2><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Test the language, visual grammar, evidence trail, and boundary statements with skeptical technical readers.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] p-8"><Label>Next</Label><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Make the workflow real.</h2><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Validate source access, calculations, spatial operations, data contracts, and human review with defined tasks.</p></div></div></section><section className="border-y border-[hsl(var(--border))] bg-[#ebe9df]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-8"><SectionHeading eyebrow="A possible MVP path" title="Earn capability one layer at a time." /><div className="space-y-4">{['A narrow set of validated coastal questions', 'A small, versioned source registry', 'Tested spatial and temporal operations', 'Evidence views reviewed with domain experts', 'A measured pilot with clear stop conditions'].map((item, i) => <div key={item} className="flex items-start gap-4 border-b border-[hsl(var(--border))] pb-4"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">0{i + 1}</span><p className="text-sm text-[hsl(var(--primary))]">{item}</p></div>)}</div></div></section><div className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-28"><SectionHeading eyebrow="Join the critique" title="The best next input is a hard question." body="Tell us what a useful evidence trail would need to show in your domain." /><div className="mt-8"><ButtonLink href="/contact">Start a conversation</ButtonLink></div></div></main>;
}

function DemoStatus({ value }: { value: string }) {
  const label = value === 'fixture' ? 'Fixture' : value === 'stale' ? 'Stale' : value === 'unavailable' ? 'Unavailable' : value === 'derived' ? 'Derived' : 'Assumed';
  const className = value === 'unavailable' ? 'border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]' : value === 'stale' ? 'border-[hsl(var(--accent))]/50 text-[hsl(var(--accent))]' : value === 'assumed' ? 'border-[hsl(var(--secondary-foreground))]/30 text-[hsl(var(--secondary-foreground))]' : 'border-[hsl(var(--primary))]/25 text-[hsl(var(--primary))]';
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-[0.1em] ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function DemoMap({ label, note }: { label: string; note: string }) {
  return (
    <div className="page-grid relative min-h-[340px] overflow-hidden rounded-2xl border border-[hsl(var(--primary))]/20 bg-[#dfece5]">
      <div className="absolute inset-0 opacity-70 contour-lines" />
      <svg viewBox="0 0 600 420" className="absolute inset-0 h-full w-full" role="img" aria-label="Illustrative Digha map with a synthetic route segment and context layers">
        <path d="M-20 302 C 80 250, 110 341, 182 290 S 294 264, 365 294 S 486 350, 620 272" fill="none" stroke="#8bb5a9" strokeWidth="2" />
        <path d="M-20 322 C 80 270, 114 361, 186 310 S 296 284, 369 314 S 486 370, 620 292" fill="none" stroke="#8bb5a9" strokeWidth="1" />
        <path d="M55 0 C 125 70, 95 130, 164 182 S 232 263, 206 350" fill="none" stroke="#9fc5bb" strokeWidth="1.5" />
        <path d="M99 0 C 167 75, 138 135, 202 188 S 269 272, 242 360" fill="none" stroke="#9fc5bb" strokeWidth="1" />
        <path d="M0 122 C 110 96, 194 137, 288 102 S 447 74, 600 110" fill="none" stroke="#5d9990" strokeWidth="1.5" strokeDasharray="5 7" />
        <path d="M78 372 L 490 72" stroke="#e0715c" strokeWidth="3" strokeDasharray="9 7" />
        <circle cx="78" cy="372" r="7" fill="#e0715c" stroke="#f4f5ed" strokeWidth="4" />
        <circle cx="490" cy="72" r="7" fill="#e0715c" stroke="#f4f5ed" strokeWidth="4" />
        <circle cx="314" cy="224" r="19" fill="#f4f5ed" fillOpacity=".85" stroke="#e0715c" strokeWidth="2" />
        <circle cx="314" cy="224" r="4" fill="#e0715c" />
      </svg>
      <div className="absolute left-4 top-4 max-w-[220px] rounded bg-[hsl(var(--card))]/90 px-3 py-2 backdrop-blur-sm">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className="mt-1 text-xs font-semibold text-[hsl(var(--primary))]">Illustrative geometry · not navigational</p>
      </div>
      <div className="absolute bottom-4 left-4 max-w-[310px] rounded bg-[hsl(var(--card))]/90 px-3 py-2 text-[10px] leading-4 text-[hsl(var(--muted-foreground))] backdrop-blur-sm">{note}</div>
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--primary))]/20 bg-[hsl(var(--card))]/75 text-[hsl(var(--primary))]"><Compass size={18} /></div>
    </div>
  );
}

function DighaDemoPage() {
  const defaultQuestion = "For a small fishing vessel near Digha, which nearshore window from 12–18 June has better support from the available evidence for surface-current conditions?";
  const [question, setQuestion] = useState(defaultQuestion);
  const [result, setResult] = useState<DecisionDemoResult | undefined>(undefined);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const mutation = useRunDighaDecisionDemo();

  const runDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ data: { question: question.trim() } }, {
      onSuccess: (data) => {
        setResult(data);
        setExpandedEvidence(null);
      },
    });
  };

  const reset = () => {
    setQuestion(defaultQuestion);
    setResult(undefined);
    setExpandedEvidence(null);
    mutation.reset();
  };

  return (
    <main className="bg-[hsl(var(--background))]">
      <div className="border-b border-[hsl(var(--accent))]/40 bg-[#ebe9df]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--primary))]">Digha / fishing decision demonstration</span>
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Demo fixture · no live providers connected</span>
        </div>
      </div>
      <section className="page-grid border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Label>ORCA / decision loop</Label>
              <h1 className="mt-5 font-display text-5xl font-semibold leading-[.96] tracking-[-0.065em] text-[hsl(var(--primary))] sm:text-7xl">Ask the Digha question. Inspect the answer.</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">This demonstration extracts a place, time window, and activity frame, then runs each workflow stage with an explicit status. It shows how ORCA would expose evidence and uncertainty; it does not provide live marine conditions or a fishing instruction.</p>
            </div>
            <div className="shrink-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:w-64">
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">Scenario last run</p>
              <p className="mt-2 text-sm font-semibold text-[hsl(var(--primary))]">14 Feb 2026 fixture</p>
              <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Local demonstration record, not a source update.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8 lg:py-16">
        <form onSubmit={runDemo} className="rounded-2xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--card))] p-5 soft-shadow sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="digha-question" className="font-mono-ui text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--accent))]">01 / Your question</label>
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">Natural language</span>
              </div>
              <textarea id="digha-question" data-testid="input-digha-question" value={question} onChange={(event) => setQuestion(event.target.value)} minLength={12} maxLength={1000} rows={3} className="mt-3 w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm leading-6 text-[hsl(var(--primary))] outline-none transition-colors focus:border-[hsl(var(--accent))]" />
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Try the preset first. The server returns a fixed Digha fixture so the workflow stays inspectable.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="submit" data-testid="button-run-digha-demo" disabled={mutation.isPending || question.trim().length < 12} className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-45">{mutation.isPending ? <><Activity size={14} className="animate-pulse" /> Preparing fixture</> : <><ArrowRight size={14} /> Run fixture analysis</>}</button>
              <button type="button" data-testid="button-reset-digha-demo" onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))]/25 px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.13em] text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"><X size={13} /> Reset scenario</button>
            </div>
          </div>
          {mutation.isPending && <div className="mt-6 border-t border-[hsl(var(--border))] pt-5"><div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]"><Activity size={14} className="animate-pulse" /> Preparing fixture inputs · running deterministic comparison</div><div className="mt-3 h-1 overflow-hidden rounded-full bg-[hsl(var(--secondary))]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[hsl(var(--accent))]" /></div></div>}
          {mutation.isError && <div role="alert" className="mt-6 flex items-start gap-3 border-t border-[hsl(var(--accent))]/40 pt-5 text-sm text-[hsl(var(--primary))]"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" /><div><strong>The fixture could not be evaluated.</strong><p className="mt-1 text-[hsl(var(--muted-foreground))]">Retry the fixture run. No live source was queried.</p></div></div>}
        </form>

        {result && (
          <div className="mt-10 space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <section className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3"><Label>Finding / directional only</Label><span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--primary-foreground))]/55">Run {result.runId}</span></div>
                <h2 className="mt-6 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">{result.finding}</h2>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-[hsl(var(--primary-foreground))]/70">{result.findingQualifier}</p>
                <div className="mt-7 flex flex-wrap gap-2">{result.evidence.filter((item) => item.usedInFinding).map((item) => <button key={item.id} type="button" onClick={() => { setExpandedEvidence(item.id); document.getElementById(`evidence-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="rounded-full border border-[hsl(var(--accent))]/60 px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--accent))]">{item.id} · inspect</button>)}</div>
              </section>
              <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
                <div className="flex items-center justify-between"><Label>Confidence</Label><span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--accent))]">Limited</span></div>
                <p className="mt-6 font-display text-4xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">{result.confidence}</p>
                <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{result.confidenceReason}</p>
              </section>
            </div>

            <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Label>02 / Extracted context</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">What the question resolved to</h2></div><span className="inline-flex items-center gap-2 font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]"><SlidersHorizontal size={13} /> Review before acting</span></div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries({ Location: result.context.location, Coordinates: result.context.coordinates, "Time window": result.context.timeWindow, Timezone: result.context.timezone, Activity: result.context.activity, Vessel: result.context.vessel }).map(([key, value]) => <div key={key} className="border-t border-[hsl(var(--border))] pt-3"><p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{key}</p><p className="mt-2 text-sm leading-5 text-[hsl(var(--primary))]">{value}</p></div>)}
              </div>
              <p className="mt-6 border-l-2 border-[hsl(var(--accent))] pl-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{result.context.extractedFrom}</p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><Label>03 / Workflow status</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Every stage stays visible</h2></div><span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">8 stages</span></div>
                <div className="mt-7 divide-y divide-[hsl(var(--border))]">{result.stages.map((stage) => <div key={stage.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-sm font-semibold text-[hsl(var(--primary))]">{stage.label}</h3><DemoStatus value={stage.status} /></div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{stage.detail}</p></div><div className="text-left sm:text-right"><p className="font-mono-ui text-[9px] uppercase leading-4 tracking-[0.08em] text-[hsl(var(--muted-foreground))]">{stage.freshness}</p>{stage.sourceRef && <p className="mt-1 font-mono-ui text-[9px] text-[hsl(var(--accent))]">{stage.sourceRef}</p>}</div></div>)}</div>
              </section>
              <DemoMap label={result.mapLabel} note={result.mapNote} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-5 sm:p-7"><Label>Risk drivers</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">Why this finding moved</h2><div className="mt-6 space-y-5">{result.riskDrivers.map((driver) => <div key={driver.label} className="border-t border-[hsl(var(--secondary-foreground))]/15 pt-3"><div className="flex items-start justify-between gap-4"><h3 className="text-sm font-semibold text-[hsl(var(--primary))]">{driver.label}</h3><span className="font-mono-ui text-[9px] text-[hsl(var(--accent))]">{driver.sourceRef}</span></div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{driver.signal}</p><p className="mt-1 text-xs font-semibold leading-5 text-[hsl(var(--primary))]">{driver.impact}</p></div>)}</div></section>
              <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7"><Label>Assumptions in this run</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">What the fixture presumes</h2><ul className="mt-6 space-y-4">{result.assumptions.map((assumption) => <li key={assumption} className="flex gap-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><CircleDot size={15} className="mt-1 shrink-0 text-[hsl(var(--accent))]" />{assumption}</li>)}</ul></section>
            </div>

            <section className="rounded-2xl border border-[hsl(var(--accent))]/35 bg-[#ebe9df] p-5 sm:p-7"><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-1 shrink-0 text-[hsl(var(--accent))]" /><div><Label>Limitations</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-[hsl(var(--primary))]">What this run cannot establish</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{result.limitations.map((limitation) => <li key={limitation} className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">{limitation}</li>)}</ul></div></div></section>

            <section className="rounded-2xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Label>Evidence ledger · {result.evidence.length} items</Label><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em]">Inspect the work behind the finding</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--primary-foreground))]/65">Each reference names its source family, freshness, operation, and whether it contributed. Unavailable inputs remain visible rather than being replaced silently.</p></div><Clipboard size={23} className="text-[hsl(var(--accent))]" /></div><div className="mt-7 divide-y divide-[hsl(var(--primary-foreground))]/15">{result.evidence.map((item) => <div id={`evidence-${item.id}`} key={item.id} className="py-4"><button type="button" aria-expanded={expandedEvidence === item.id} onClick={() => setExpandedEvidence(expandedEvidence === item.id ? null : item.id)} className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="font-mono-ui text-[10px] text-[hsl(var(--accent))]">{item.id}</span><div><h3 className="text-sm font-semibold">{item.claim}</h3><p className="mt-1 text-xs text-[hsl(var(--primary-foreground))]/55">{item.source} · {item.operation}</p></div></div><div className="flex items-center gap-3 sm:shrink-0"><DemoStatus value={item.status === 'used' ? 'derived' : item.status} /><ChevronDown size={16} className={`text-[hsl(var(--primary-foreground))]/55 transition-transform ${expandedEvidence === item.id ? 'rotate-180' : ''}`} /></div></button>{expandedEvidence === item.id && <div className="ml-8 mt-4 grid gap-3 border-l border-[hsl(var(--accent))]/50 pl-4 text-xs leading-5 text-[hsl(var(--primary-foreground))]/65 sm:grid-cols-3"><p><strong className="text-[hsl(var(--primary-foreground))]">Timestamp</strong><br />{item.timestamp}</p><p><strong className="text-[hsl(var(--primary-foreground))]">Used in finding</strong><br />{item.usedInFinding ? 'Yes · referenced above' : 'No · transparency only'}</p><p><strong className="text-[hsl(var(--primary-foreground))]">Detail</strong><br />{item.detail}</p></div>}</div>)}</div></section>
          </div>
        )}
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <PageMeta />
      <Header />
      <div id="main-content" tabIndex={-1}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/problem" component={ProblemPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/technology" component={TechnologyPage} />
          <Route path="/data-sources" component={DataSourcesPage} />
          <Route path="/science" component={SciencePage} />
          <Route path="/trust" component={TrustPage} />
          <Route path="/security" component={SecurityPage} />
          {Object.entries(legalPages).map(([path, page]) => (
            <Route key={path} path={path}><LegalPage page={page} /></Route>
          ))}
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/status" component={StatusPage} />
          <Route path="/methodology" component={MethodologyPage} />
          <Route path="/research" component={ResearchPage} />
          <Route path="/demo/digha" component={DighaDemoPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
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