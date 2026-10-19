import { useEffect, useRef, useState } from 'react';
import { ScanLine, CheckCircle2, XCircle, Copy, WifiOff, CameraOff, ScanText, Pencil, RotateCcw, Play, Info, Check } from 'lucide-react';
import HormuudLogo from '../../components/HormuudLogo';
import { Button, Card, Input, PageHeader, StatusBadge, Badge, cx, usePreview } from '../ui';
import { scans, exams } from '../data';

const STATES = [
  { id: 'idle', label: 'Ready' },
  { id: 'scanning', label: 'Reading…' },
  { id: 'confirm', label: 'Confirm ID' },
  { id: 'eligible', label: 'Eligible' },
  { id: 'ineligible', label: 'Not Eligible' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'failed', label: 'Not recognised' },
  { id: 'denied', label: 'Camera blocked' },
  { id: 'offline', label: 'Offline queued' },
];

const RESULT = {
  eligible: { tone: 'green', icon: CheckCircle2, title: 'ELIGIBLE', text: 'Attendance recorded. Student may enter.', box: 'border-emerald-200 bg-emerald-50 text-emerald-900', ic: 'text-brand' },
  ineligible: { tone: 'red', icon: XCircle, title: 'NOT ELIGIBLE', text: 'Outstanding balance. Refer to the examination office.', box: 'border-red-200 bg-red-50 text-red-900', ic: 'text-red-600' },
  duplicate: { tone: 'amber', icon: Copy, title: 'ALREADY SCANNED', text: 'Attendance was recorded at 09:42:18 by Fadumo Ali.', box: 'border-amber-200 bg-amber-50 text-amber-900', ic: 'text-amber-600' },
  offline: { tone: 'blue', icon: WifiOff, title: 'QUEUED OFFLINE', text: 'No connection. Saved on this device and will sync automatically.', box: 'border-sky-200 bg-sky-50 text-sky-900', ic: 'text-brand-blue' },
};

// A fictional printed ID card, clearly labelled as simulation.
const DemoCard = ({ scanning }) => (
  <div className="relative w-[78%] max-w-[360px] rotate-[-2deg] rounded-xl bg-white p-3 shadow-2xl">
    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
      <HormuudLogo size={34} className="!shadow-none !ring-0" />
      <div className="leading-tight"><p className="text-[11px] font-bold text-brand-dark">HORMUUD UNIVERSITY</p><p className="text-[9px] text-slate-500">STUDENT IDENTITY CARD · DEMO</p></div>
    </div>
    <div className="mt-2 flex gap-3">
      <div className="h-16 w-14 rounded bg-slate-200" />
      <div className="min-w-0 text-[10px] leading-tight text-slate-600">
        <p className="font-bold text-slate-800">AMINA HASSAN ALI</p>
        <p>Software Engineering</p>
        <p className={cx('mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[13px] font-bold tracking-wider text-slate-900', scanning && 'bg-emerald-200/70')}>HU00004698</p>
      </div>
    </div>
  </div>
);

function CameraPanel({ state, portrait }) {
  const denied = state === 'denied';
  const frame = { idle: 'border-white/80', scanning: 'border-emerald-400', confirm: 'border-emerald-400', failed: 'border-red-400' }[state] || 'border-emerald-400';
  return (
    <div className={cx('relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#0B1220]', portrait ? 'aspect-[3/4] max-h-[520px]' : 'aspect-video')}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1E2C4D,#0B1220_70%)]" />
      {denied ? (
        <div className="relative max-w-xs p-6 text-center text-white">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><CameraOff size={26} /></span>
          <p className="font-semibold">Camera access is blocked</p>
          <p className="mt-1 text-sm text-slate-300">Allow camera permission in the browser address bar, then retry. You can also type the Student ID manually.</p>
        </div>
      ) : (
        <>
          <DemoCard scanning={state === 'scanning'} />
          <div className={cx('pointer-events-none absolute inset-x-[8%] inset-y-[22%] rounded-2xl border-2 transition-colors', frame)}>
            {state === 'scanning' && <div className="absolute inset-x-2 top-0 h-0.5 animate-[scanline_1.6s_ease-in-out_infinite] bg-emerald-400 shadow-[0_0_14px_#34d399]" />}
          </div>
          <p className="absolute inset-x-0 top-[calc(22%-2rem)] text-center text-xs font-semibold text-white/90">Align the printed Student ID number inside the frame</p>
          <span className="absolute left-3 top-3 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-bold text-[#0B1220]">PREVIEW SIMULATION · no real camera</span>
        </>
      )}
    </div>
  );
}

export default function ScannerScreen({ concept }) {
  const { toast } = usePreview();
  const [state, setState] = useState('idle');
  const [manual, setManual] = useState('HU00004698');
  const [editing, setEditing] = useState(false);
  const [log, setLog] = useState(scans.slice(0, 4));
  const timer = useRef([]);
  const exam = exams[0];
  const clear = () => { timer.current.forEach(clearTimeout); timer.current = []; };
  useEffect(() => clear, []);

  const runFinal = useRef('eligible');
  const run = (final = 'eligible') => {
    clear();
    runFinal.current = final;
    setState('scanning');
    timer.current.push(setTimeout(() => setState(final === 'failed' ? 'failed' : 'confirm'), 1400));
  };
  const confirmId = () => {
    const r = runFinal.current;
    setState(r);
    const label = { eligible: 'Eligible', ineligible: 'Not Eligible', duplicate: 'Duplicate', offline: 'Queued offline' }[r];
    if (label) setLog((l) => [{ time: new Date().toTimeString().slice(0, 8), id: manual, name: 'Amina Hassan Ali', result: label }, ...l].slice(0, 5));
    toast(`Preview result: ${label || r}`, 'info');
  };
  const res = RESULT[state];
  const busy = state === 'scanning';
  const portrait = concept !== 'C';

  return (
    <>
      <style>{'@keyframes scanline{0%,100%{top:0}50%{top:calc(100% - 2px)}}'}</style>
      <PageHeader eyebrow="Attendance" title="Scan Student ID" subtitle="The camera reads the printed Student ID text with OCR. No QR code or barcode is needed."
        actions={<Badge tone="blue"><ScanText size={13} />OCR text recognition</Badge>} />
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Selected examination</span>
        <b>{exam.name}</b><span className="text-brand-muted">{exam.room} · {exam.time}</span>
        <span className="ml-auto"><StatusBadge status="Live" /></span>
      </div>

      <div className={cx('grid gap-5', concept === 'C' ? 'xl:grid-cols-[1.6fr_1fr]' : 'lg:grid-cols-[minmax(0,1fr)_380px]')}>
        <div className="min-w-0 space-y-4">
          <CameraPanel state={state} portrait={portrait && false} />
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex-1 basis-56">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">OCR status</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                <span className={cx('h-2.5 w-2.5 rounded-full', busy ? 'animate-pulse bg-brand-blue' : state === 'failed' || state === 'denied' ? 'bg-red-600' : 'bg-brand')} />
                {{ idle: 'Waiting for a Student ID', scanning: 'Reading text from the camera…', confirm: 'ID recognised — please confirm', failed: 'Could not read an ID. Move closer and avoid glare.', denied: 'No camera access', eligible: 'Result ready', ineligible: 'Result ready', duplicate: 'Result ready', offline: 'Saved locally' }[state]}
              </p>
            </div>
            <Button icon={Play} loading={busy} onClick={() => run('eligible')}>Run simulation</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => { clear(); setState('idle'); }}>Scan next</Button>
          </div>

          {(state === 'confirm' || state === 'failed' || state === 'idle' || state === 'denied') && (
            <Card title={state === 'confirm' ? 'Recognised Student ID' : 'Enter Student ID manually'} subtitle={state === 'confirm' ? 'Check it against the card, correct if needed, then confirm.' : 'Fallback when OCR cannot read the card.'}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] flex-1">
                  <Input value={manual} disabled={state === 'confirm' && !editing} onChange={(e) => setManual(e.target.value.toUpperCase())} className="font-mono text-lg font-bold tracking-wider" aria-label="Student ID" />
                </div>
                {state === 'confirm' ? (
                  <>
                    <Button variant="secondary" icon={Pencil} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Correct'}</Button>
                    <Button icon={Check} onClick={confirmId}>Confirm & record</Button>
                  </>
                ) : (
                  <Button icon={ScanLine} onClick={() => { runFinal.current = 'eligible'; setState('confirm'); }}>Look up</Button>
                )}
              </div>
            </Card>
          )}

          {res && (
            <div className={cx('flex items-start gap-4 rounded-xl border p-5', res.box)} role="status">
              <res.icon size={40} className={cx('shrink-0', res.ic)} />
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold tracking-tight">{res.title}</p>
                <p className="mt-0.5 text-sm font-medium">Amina Hassan Ali · <span className="font-mono">{manual}</span></p>
                <p className="mt-1 text-sm opacity-90">{res.text}</p>
                <Button className="mt-4" icon={RotateCcw} onClick={() => setState('idle')}>Scan next</Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Preview a result state" subtitle="Jump straight to any state for review.">
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <button key={s.id} onClick={() => { clear(); setState(s.id); }} aria-pressed={state === s.id}
                  className={cx('min-h-[36px] rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition', state === s.id ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{s.label}</button>
              ))}
            </div>
          </Card>
          <Card title="Positioning guide">
            <ol className="space-y-2.5 text-sm text-slate-700">
              {['Hold the card flat, about 15–20 cm away.', 'Place the printed ID number (HU…) inside the frame.', 'Avoid glare; keep the text sharp and level.', 'Wait for the number, then confirm.'].map((t, i) => (
                <li key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-brand-deep">{i + 1}</span>{t}</li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-900"><Info size={15} className="mt-0.5 shrink-0" />The simulated card above is fictional and the camera is not active in this preview.</p>
          </Card>
          <Card title="Recent scans" pad={false}>
            <ul className="divide-y divide-slate-100">
              {log.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.name}</p><p className="font-mono text-xs text-brand-muted">{s.id} · {s.time}</p></div>
                  <StatusBadge status={s.result} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
