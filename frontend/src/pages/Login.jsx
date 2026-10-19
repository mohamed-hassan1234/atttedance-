import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff, ScanLine, ShieldCheck, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HormuudLogo from '../components/HormuudLogo';

// Demo credentials are only ever rendered in a dev build — import.meta.env.DEV
// is replaced at build time by Vite, so this block (and the strings in it) is
// stripped out of `vite build`'s production bundle entirely, not just hidden.
const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin1', password: 'Admin@123' },
  { role: 'Invigilator', username: 'invig1', password: 'Invigilator@123' },
];

const FEATURES = [
  { Icon: ScanLine, text: 'OCR-powered Student ID recognition' },
  { Icon: ShieldCheck, text: 'Real-time eligibility verification' },
  { Icon: RefreshCcw, text: 'Reliable attendance tracking & offline sync' },
];

const inputCls = 'min-h-[48px] w-full rounded-lg border border-slate-200 bg-white text-sm text-brand-dark placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-slate-50 disabled:text-slate-400';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // belt-and-suspenders against a duplicate submit
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220] p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-2">
        {/* Form */}
        <div className="fade-up p-6 sm:p-12">
          <div className="mb-8 flex items-center gap-3">
            <HormuudLogo size={44} />
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-brand-dark">SEAMS</p>
              <p className="text-[11px] text-brand-muted">Hormuud University</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-[28px]">Welcome back</h1>
          <p className="mb-8 mt-1.5 text-sm text-brand-muted">Sign in to access your examination workspace.</p>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-5">
            <span className="sr-only" role="status" aria-live="polite">{loading ? 'Signing in…' : ''}</span>

            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-[13px] font-semibold text-brand-dark">Username</label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  disabled={loading}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className={`${inputCls} pl-10 pr-3.5`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-semibold text-brand-dark">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputCls} pl-10 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">Demo accounts (development only)</p>
              <div className="grid grid-cols-2 gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div key={acc.role} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-brand-dark">
                      <ShieldCheck size={11} aria-hidden="true" /> {acc.role}
                    </p>
                    <p className="break-all font-mono text-[11px] leading-snug text-brand-muted">{acc.username}</p>
                    <p className="break-all font-mono text-[11px] leading-snug text-brand-muted">{acc.password}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-[11px] text-brand-muted">
            © {new Date().getFullYear()} Hormuud University — Examinations Portal
          </p>
        </div>

        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-deep p-12 text-white lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 36px)' }} aria-hidden="true" />
          <p className="relative inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            Smart Examination Attendance Management
          </p>
          <div className="relative my-10">
            <h2 className="text-3xl font-bold leading-tight tracking-tight">Verify every student at the exam room door.</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Scan the printed Student ID, confirm eligibility instantly, and keep a complete audit trail for every examination, even when the room loses connection.
            </p>
            <ul className="mt-8 space-y-4">
              {FEATURES.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5 text-sm font-medium">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon size={19} strokeWidth={2} aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-white/60">Office of the Registrar — Examinations Unit</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
