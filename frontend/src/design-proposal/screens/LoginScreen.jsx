import { useState } from 'react';
import { Eye, EyeOff, Lock, User, ShieldCheck, ScanLine, WifiOff, AlertCircle, ArrowRight } from 'lucide-react';
import HormuudLogo from '../../components/HormuudLogo';
import { Button, Field, Input, cx } from '../ui';

const FEATURES = [
  { icon: ScanLine, t: 'Student ID text recognition', d: 'Point the camera at a printed ID; OCR reads the number.' },
  { icon: ShieldCheck, t: 'Instant eligibility decision', d: 'Eligible or Not Eligible shown in under a second.' },
  { icon: WifiOff, t: 'Works through poor connectivity', d: 'Scans queue offline and sync automatically.' },
];

// Review-only form: values never leave the component.
const LoginForm = ({ dark }) => {
  const [show, setShow] = useState(false);
  const [state, setState] = useState('idle'); // idle | loading | error | disabled
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const submit = (e) => {
    e.preventDefault();
    setState('loading');
    setTimeout(() => setState('error'), 1200);
  };
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {state === 'error' && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span><b>Sign-in failed.</b> This is the preview error state — no credentials were sent anywhere.</span>
        </div>
      )}
      <Field label="Username"><Input icon={User} value={user} onChange={(e) => setUser(e.target.value)} placeholder="Enter your username" autoComplete="off" disabled={state === 'disabled'} invalid={state === 'error'} /></Field>
      <Field label="Password">
        <Input icon={Lock} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter your password" autoComplete="off" disabled={state === 'disabled'} invalid={state === 'error'}
          right={<button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={state === 'loading'} disabled={state === 'disabled'} icon={state === 'loading' ? undefined : ArrowRight}>
        {state === 'loading' ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className={cx('flex flex-wrap items-center gap-2 text-xs', dark ? 'text-slate-400' : 'text-brand-muted')}>
        <span>Preview states:</span>
        {['idle', 'loading', 'error', 'disabled'].map((s) => (
          <button type="button" key={s} onClick={() => setState(s)} className={cx('min-h-[28px] rounded-full px-2.5 font-semibold', state === s ? 'bg-brand text-white' : dark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600')}>{s}</button>
        ))}
      </div>
      <div className={cx('rounded-xl border p-4 text-sm', dark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600')}>
        <p className={cx('mb-1 font-semibold', dark ? 'text-white' : 'text-brand-dark')}>Demo accounts (design preview)</p>
        <p>Admin and Invigilator roles are shown in the next screens. This form is not connected to any backend.</p>
      </div>
    </form>
  );
};

const Brand = ({ tone }) => (
  <div className={cx('relative flex h-full flex-col justify-between overflow-hidden p-8 sm:p-12', tone === 'dark' ? 'bg-[#0B1220] text-white' : 'bg-brand-deep text-white')}>
    <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 36px)' }} />
    <div className="relative flex items-center gap-3"><HormuudLogo size={52} /><div className="leading-tight"><p className="text-lg font-bold">SEAMS</p><p className="text-xs text-white/70">Hormuud University</p></div></div>
    <div className="relative my-10 max-w-lg">
      <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Smart Examination Attendance Management</p>
      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Verify every student at the exam room door.</h1>
      <p className="mt-4 text-base text-white/80">Scan the printed Student ID, confirm eligibility instantly, and keep a complete audit trail for every examination.</p>
      <ul className="mt-8 space-y-4">
        {FEATURES.map(({ icon: Icon, t, d }) => (
          <li key={t} className="flex gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15"><Icon size={19} /></span>
            <span><b className="block text-sm">{t}</b><span className="text-sm text-white/70">{d}</span></span>
          </li>
        ))}
      </ul>
    </div>
    <p className="relative text-xs text-white/60">© Hormuud University · Examination Office</p>
  </div>
);

export default function LoginScreen({ concept }) {
  if (concept === 'B') {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#0B1220] p-4 font-body sm:p-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-[#111C33] shadow-2xl lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <div className="mb-8 flex items-center gap-3"><HormuudLogo size={44} /><span className="text-lg font-bold text-white">SEAMS</span></div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="mb-8 mt-1 text-sm text-slate-400">Sign in to run today's examination attendance.</p>
            <LoginForm dark />
          </div>
          <div className="hidden lg:block"><Brand tone="green" /></div>
        </div>
      </div>
    );
  }
  if (concept === 'C') {
    return (
      <div className="min-h-full bg-brand-bg font-body">
        <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.1fr_1fr]">
          <div className="hidden lg:block"><Brand tone="dark" /></div>
          <div className="flex items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3 lg:hidden"><HormuudLogo size={44} /><span className="text-lg font-bold">SEAMS</span></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Examination control center</p>
              <h2 className="mb-6 mt-1 text-2xl font-bold text-brand-dark">Sign in</h2>
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid min-h-full bg-white font-body lg:grid-cols-[1fr_1.05fr]">
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><HormuudLogo size={44} /><span className="text-lg font-bold">SEAMS</span></div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-dark">Sign in to SEAMS</h2>
          <p className="mb-8 mt-2 text-sm text-brand-muted">Use your university examination office account.</p>
          <LoginForm />
        </div>
      </div>
      <div className="hidden lg:block"><Brand tone="green" /></div>
    </div>
  );
}
