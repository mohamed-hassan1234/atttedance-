import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen grid md:grid-cols-2 bg-ledger-50">
      {/* Left: brand / context panel */}
      <div className="hidden md:flex flex-col justify-between bg-ledger-950 text-white p-12 paper-texture relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-seal flex items-center justify-center text-ledger-950">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="font-display text-lg">SEAMS</p>
            <p className="text-ledger-400 text-xs">Smart Examination Attendance Management System</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight mb-4">
            Every seat verified.<br />Every record trusted.
          </p>
          <p className="text-ledger-300 text-sm leading-relaxed">
            Scan an ID, confirm eligibility instantly, and keep working even
            when the room loses connection — every record syncs the moment
            it's back.
          </p>
        </div>

        <p className="text-ledger-500 text-xs">Faculty of Computer Science / Information Technology</p>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm fade-up">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center text-ledger-950">
              <ShieldCheck size={20} />
            </div>
            <p className="font-display text-lg text-ledger-900">SEAMS</p>
          </div>

          <h1 className="font-display text-2xl text-ledger-900 mb-1">Sign in</h1>
          <p className="text-ledger-400 text-sm mb-8">Enter your Admin or Invigilator credentials.</p>

          {error && (
            <div className="mb-5 flex items-start gap-2 bg-ineligible/10 border border-ineligible/30 text-ineligible text-sm rounded-xl px-3.5 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ledger-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin1 or invig1"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 focus:border-seal transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ledger-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 focus:border-seal transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ledger-400 hover:text-ledger-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white font-medium text-sm py-2.75 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 border-t border-ledger-100 pt-5">
            <p className="text-xs text-ledger-400 mb-2 font-semibold uppercase tracking-wide">Demo accounts (after seeding)</p>
            <ul className="text-xs text-ledger-500 space-y-1 font-mono">
              <li>admin1 / Admin@123</li>
              <li>invig1 / Invigilator@123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
