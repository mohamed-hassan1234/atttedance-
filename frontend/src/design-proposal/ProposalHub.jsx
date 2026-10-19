import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Monitor, Laptop, Tablet, Smartphone, LayoutGrid, Eye, Palette, ExternalLink } from 'lucide-react';
import HormuudLogo from '../components/HormuudLogo';
import { CONCEPTS, SCREENS } from './theme';
import { cx } from './ui';

const DEVICES = [
  { id: 'desktop', label: 'Large desktop', icon: Monitor, w: null },
  { id: 'laptop', label: 'Laptop 1280', icon: Laptop, w: 1280 },
  { id: 'tablet', label: 'Tablet 820', icon: Tablet, w: 820 },
  { id: 'mobile', label: 'Mobile 390', icon: Smartphone, w: 390 },
];
const SWATCHES = [
  ['Primary green', '#138653'], ['Deep green', '#087443'], ['Brand blue', '#278FC5'], ['Navy', '#0B1220'],
  ['Soft bg', '#F5F8FA'], ['Text', '#17212B'], ['Muted', '#64748B'],
];
const frameUrl = (c, s) => `/design-proposal/preview?concept=${c}&screen=${s}`;

const Scaled = ({ src }) => {
  const box = useRef(null);
  const [scale, setScale] = useState(0.3);
  useLayoutEffect(() => { if (box.current) setScale(box.current.clientWidth / 1280); }, []);
  useEffect(() => {
    const on = () => box.current && setScale(box.current.clientWidth / 1280);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div ref={box} className="relative w-full overflow-hidden bg-slate-100" style={{ aspectRatio: '1280 / 800' }}>
      <iframe title="Concept preview" src={src} loading="lazy" tabIndex={-1} className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
        style={{ width: 1280, height: 800, transform: `scale(${scale})`, transformOrigin: 'top left' }} />
    </div>
  );
};

export default function ProposalHub() {
  const [concept, setConcept] = useState('A');
  const [screen, setScreen] = useState('admin');
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('preview'); // preview | compare | overview
  const frame = useRef(null);
  const initial = useRef({ concept, screen });

  const push = (c, s) => frame.current?.contentWindow?.postMessage({ type: 'seams-proposal-set', concept: c, screen: s }, window.location.origin);
  useEffect(() => { push(concept, screen); }, [concept, screen, mode]);
  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'seams-proposal-nav') setScreen(e.data.screen);
      if (e.data?.type === 'seams-proposal-ready') push(concept, screen);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  });

  const dev = DEVICES.find((d) => d.id === device);
  const c = CONCEPTS[concept];
  const seg = (active) => cx('flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition', active ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-300 hover:text-white');

  return (
    <div className="flex h-screen flex-col bg-[#0B1220] font-body text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#0B1220]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <HormuudLogo size={40} />
            <div className="leading-tight"><p className="text-sm font-bold">SEAMS · UI/UX design proposal</p><p className="text-xs text-slate-400">Review only · demo data · production app untouched</p></div>
          </div>
          <div className="flex rounded-lg bg-white/10 p-1" role="tablist" aria-label="Concept">
            {Object.values(CONCEPTS).map((k) => (
              <button key={k.id} role="tab" aria-selected={concept === k.id} onClick={() => setConcept(k.id)}
                className={cx('min-h-[40px] rounded-md px-3.5 text-sm font-semibold transition', concept === k.id ? 'bg-brand text-white' : 'text-slate-300 hover:text-white')}>
                Concept {k.id}<span className="hidden xl:inline"> · {k.short}</span>
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-white/10 p-1" role="tablist" aria-label="View">
            <button className={seg(mode === 'preview')} onClick={() => setMode('preview')}><Eye size={16} />Preview</button>
            <button className={seg(mode === 'compare')} onClick={() => setMode('compare')}><LayoutGrid size={16} />Compare</button>
            <button className={seg(mode === 'overview')} onClick={() => setMode('overview')}><Palette size={16} />Design system</button>
          </div>
          {mode === 'preview' && (
            <>
              <select value={screen} onChange={(e) => setScreen(e.target.value)} aria-label="Screen" className="min-h-[44px] rounded-lg border border-white/15 bg-[#111C33] px-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand">
                {SCREENS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <div className="flex rounded-lg bg-white/10 p-1" role="group" aria-label="Device">
                {DEVICES.map((d) => (
                  <button key={d.id} onClick={() => setDevice(d.id)} aria-pressed={device === d.id} title={d.label} className={seg(device === d.id)}><d.icon size={16} /><span className="hidden 2xl:inline">{d.label}</span></button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-xs text-slate-300 sm:px-6"><b className="text-white">Concept {c.id} — {c.name}.</b> {c.blurb}</p>
      </header>

      {mode === 'preview' && (
        <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-[#111C33] p-0 sm:p-4">
          <iframe ref={frame} title={`Concept ${concept} — ${screen}`} src={frameUrl(initial.current.concept, initial.current.screen)}
            onLoad={() => push(concept, screen)}
            className={cx('h-full shrink-0 border-0 bg-white', dev.w && 'rounded-xl shadow-2xl ring-1 ring-white/20')}
            style={{ width: dev.w ? Math.min(dev.w, 99999) : '100%', maxWidth: '100%' }} />
        </div>
      )}

      {mode === 'compare' && (
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300" htmlFor="cmp">Compare screen:</label>
            <select id="cmp" value={screen} onChange={(e) => setScreen(e.target.value)} className="min-h-[44px] rounded-lg border border-white/15 bg-[#111C33] px-3 text-sm text-white">
              {SCREENS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            {Object.values(CONCEPTS).map((k) => (
              <article key={k.id} className={cx('overflow-hidden rounded-2xl bg-white text-brand-dark ring-2', concept === k.id ? 'ring-brand' : 'ring-transparent')}>
                <Scaled src={frameUrl(k.id, screen)} />
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">Concept {k.id}</p>
                  <h2 className="text-lg font-bold">{k.name}</h2>
                  <p className="mt-1 text-sm text-brand-muted">{k.blurb}</p>
                  <ul className="mt-3 space-y-1 text-sm">{k.traits.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}</ul>
                  <button onClick={() => { setConcept(k.id); setMode('preview'); }} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-deep"><ExternalLink size={16} />Explore Concept {k.id}</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {mode === 'overview' && (
        <div className="min-h-0 flex-1 overflow-auto bg-brand-bg p-4 text-brand-dark sm:p-8">
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">Concept {c.id} — {c.name}</h2>
              <p className="mt-1 text-sm text-brand-muted">{c.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm">{c.traits.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}</ul>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">Brand foundations (shared by all concepts)</h2>
              <div className="mt-4 flex items-center gap-4"><HormuudLogo size={64} /><p className="text-sm text-brand-muted">Real logo reused from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">src/assets/hormuud-logo.jpeg</code> through the existing <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">HormuudLogo</code> component.</p></div>
              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
                {SWATCHES.map(([n, v]) => <div key={v} className="text-center"><div className="h-12 rounded-lg ring-1 ring-black/10" style={{ background: v }} /><p className="mt-1.5 text-[11px] font-semibold leading-tight">{n}</p><p className="font-mono text-[10px] text-brand-muted">{v}</p></div>)}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <h2 className="text-lg font-bold">Typography — Inter</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="text-[28px] font-bold tracking-tight">Page title 28 / 700</p><p className="mt-1 text-[15px] font-semibold">Section heading 15 / 600</p><p className="mt-1 text-sm">Body text 14 / 400 for forms and descriptions.</p><p className="mt-1 text-xs text-brand-muted">Caption and metadata 12 / 400</p></div>
                <div className="text-sm text-brand-muted"><p>Inter is already loaded in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">index.html</code> (Google Fonts, weights 400–800) and mapped to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">font-body</code> / <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">font-display</code> in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">tailwind.config.js</code>. The proposal reuses it; no new font was added.</p></div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
