import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarClock, CheckCircle2, Clock, ScanLine, ArrowRight, Radio, RefreshCcw, MapPin, WifiOff, Wifi } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { getQueue } from '../services/offlineQueue';

const statusTone = (status) => (status === 'ongoing' ? 'eligible' : status === 'completed' ? 'neutral' : 'pending');

const Card = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`min-w-0 rounded-xl border border-ledger-100 bg-white shadow-card ${className}`}>
    <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-brand-dark">{title}</h2>
        {subtitle && <p className="text-xs text-brand-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Donut = ({ eligible, notEligible }) => {
  const total = eligible + notEligible;
  const r = 52;
  const c = 2 * Math.PI * r;
  const eLen = total ? (eligible / total) * c : 0;
  const nLen = total ? (notEligible / total) * c : 0;
  const pct = total ? `${((eligible / total) * 100).toFixed(1)}%` : '—';
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={`${pct} eligible`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F6" strokeWidth="16" />
      {eLen > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke="#138653" strokeWidth="16" strokeDasharray={`${Math.max(eLen - 2, 0)} ${c}`} transform="rotate(-90 70 70)" />}
      {nLen > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke="#B33A3A" strokeWidth="16" strokeDasharray={`${Math.max(nLen - 2, 0)} ${c}`} strokeDashoffset={-eLen} transform="rotate(-90 70 70)" />}
      <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="700" fill="#17212B">{pct}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#64748B">eligible</text>
    </svg>
  );
};

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [exams, setExams] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [recent, setRecent] = useState([]);
  const [liveCount, setLiveCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [ov, ex, dept] = await Promise.all([
        api.get('/reports/overview'),
        api.get('/exams'),
        api.get('/reports/by-department'),
      ]);
      setOverview(ov.data.data);
      setExams(ex.data.data.slice(0, 5));
      setByDept(dept.data.data);
      api.get('/qr/scans', { params: { limit: 6 } }).then(({ data }) => setRecent(data.data)).catch(() => setRecent([]));
      const live = ex.data.data.find((e) => e.status === 'ongoing');
      if (live) {
        api.get(`/attendance/exam/${live._id}`).then(({ data }) => setLiveCount(data.data.length)).catch(() => setLiveCount(null));
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const live = exams.find((e) => e.status === 'ongoing');
  const present = overview?.totalPresent ?? 0;
  const notElig = overview?.totalNotEligible ?? 0;
  const deptRows = byDept.slice(0, 6).map((d) => ({
    label: d._id?.department || d._id?.faculty || 'Unassigned',
    pct: d.total ? Math.round((d.eligible / d.total) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-[28px]">Admin dashboard</h1>
          <p className="mt-1 text-sm text-brand-muted">System-wide attendance and examination status.</p>
        </div>
        <Link to="/exams" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep">
          <CalendarClock size={16} /> Manage examinations
        </Link>
      </div>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>Could not load dashboard data. Check the connection and try again.</span>
          <button onClick={load} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 font-semibold"><RefreshCcw size={14} /> Retry</button>
        </div>
      )}

      {live && (
        <section className="overflow-hidden rounded-xl bg-[#0B1220] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><Radio size={14} className="animate-pulse" /> LIVE NOW</p>
              <h2 className="mt-1 text-xl font-bold">{live.examName}</h2>
              <p className="text-sm text-slate-300">{live.courseCode} · {live.examRoom} · {live.startTime}–{live.endTime}</p>
            </div>
            <Link to={`/scan?examId=${live._id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-deep">
              <ScanLine size={16} /> Open scanner
            </Link>
          </div>
          {liveCount !== null && (
            <p className="mt-4 text-sm text-slate-300"><b className="text-2xl tabular-nums text-white">{liveCount}</b> attendance records so far</p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Examinations" value={overview?.totalExams ?? 0} icon={CalendarClock} tone="blue" loading={loading} />
        <StatCard label="Present (Eligible)" value={present} icon={CheckCircle2} tone="eligible" loading={loading} />
        <StatCard label="Not Eligible" value={notElig} icon={Users} tone="ineligible" loading={loading} />
        <StatCard label="Pending Sync" value={overview?.totalPending ?? 0} icon={Clock} tone="pending" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Eligible vs Not Eligible" subtitle="All recorded attendance">
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
            <Donut eligible={present} notEligible={notElig} />
            <ul className="w-full space-y-3 text-sm">
              <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-brand" />Eligible</span><b className="tabular-nums">{present.toLocaleString()}</b></li>
              <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-ineligible" />Not eligible</span><b className="tabular-nums">{notElig.toLocaleString()}</b></li>
            </ul>
          </div>
        </Card>
        <Card title="Eligibility rate by department" subtitle="Share of scans that were eligible">
          <div className="space-y-3 p-5">
            {deptRows.length === 0 && <p className="py-4 text-center text-sm text-brand-muted">{loading ? 'Loading…' : 'No attendance recorded yet.'}</p>}
            {deptRows.map((d) => (
              <div key={d.label} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-brand-muted" title={d.label}>{d.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-blue" style={{ width: `${d.pct}%` }} /></div>
                <span className="w-10 text-right font-semibold tabular-nums">{d.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card title="Upcoming & recent examinations" action={<Link to="/exams" className="flex items-center gap-1 text-sm font-semibold text-brand-deep hover:underline">View all <ArrowRight size={14} /></Link>}>
          <div className="mt-2 divide-y divide-ledger-100">
            {exams.length === 0 && !loading && <p className="px-5 py-8 text-center text-sm text-brand-muted">No examinations scheduled yet.</p>}
            {exams.map((exam) => (
              <div key={exam._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-dark">{exam.examName}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">{exam.courseCode} · {exam.examRoom} · {new Date(exam.examDate).toLocaleDateString()}</p>
                </div>
                <Badge tone={statusTone(exam.status)}>{exam.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent scans" subtitle="Latest OCR/ID verifications">
          <ul className="mt-2 divide-y divide-ledger-100">
            {recent.length === 0 && <li className="px-5 py-8 text-center text-sm text-brand-muted">No scans yet.</li>}
            {recent.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.student?.fullName || 'Unknown student'}</p>
                  <p className="font-mono text-xs text-brand-muted">{s.studentIdSnapshot || '—'} · {new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge tone={s.scanStatus === 'Successful' ? 'eligible' : s.scanStatus === 'Duplicate scan' ? 'pending' : 'ineligible'}>{s.scanStatus}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

const InvigilatorDashboard = () => {
  const { user, isOnline } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const queued = getQueue().length;

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/exams?mine=true');
        setExams(data.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">Invigilator workspace</p>
          <h1 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-[28px]">Welcome, {user?.fullName?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-brand-muted">Your assigned examinations. Pick one to start taking attendance.</p>
        </div>
        <Link to="/scan" className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep">
          <ScanLine size={17} /> Start taking attendance
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          {loading && <p className="text-sm text-brand-muted">Loading your assignments…</p>}
          {!loading && exams.length === 0 && (
            <div className="rounded-xl border border-ledger-100 bg-white p-8 text-center shadow-card">
              <p className="text-sm text-brand-muted">No examinations are currently assigned to you.</p>
            </div>
          )}
          {exams.map((exam) => (
            <div key={exam._id} className="fade-up flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ledger-100 bg-white p-5 shadow-card">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2"><Badge tone={statusTone(exam.status)}>{exam.status}</Badge></div>
                <p className="text-lg font-semibold tracking-tight text-brand-dark">{exam.examName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted">
                  <span>{exam.courseCode}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> Room {exam.examRoom}</span>
                  <span>{exam.startTime}–{exam.endTime} · {new Date(exam.examDate).toLocaleDateString()}</span>
                </p>
              </div>
              <Link to={`/scan?examId=${exam._id}`} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-deep">
                <ScanLine size={16} /> Start attendance
              </Link>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <Link to="/scan" className="block rounded-xl bg-[#0B1220] p-6 text-white transition hover:bg-[#111C33]">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"><ScanLine size={24} /></span>
            <p className="text-lg font-bold">OCR Student ID scanner</p>
            <p className="mt-1 text-sm text-white/75">Hold the printed Student ID inside the frame. The number is read automatically.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Open scanner <ArrowRight size={14} /></span>
          </Link>
          <Card title="Offline synchronization">
            <div className="flex items-center gap-3 p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${isOnline ? 'bg-emerald-50 text-brand' : 'bg-amber-50 text-amber-700'}`}>{isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}</span>
              <div>
                <p className="text-sm font-semibold">{isOnline ? 'Online' : 'Offline — scans are queued'}</p>
                <p className="text-xs text-brand-muted">{queued > 0 ? `${queued} scan${queued === 1 ? '' : 's'} waiting to sync` : 'No scans waiting to sync'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <InvigilatorDashboard />;
};

export default Dashboard;
