import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarClock, CheckCircle2, Clock, ScanLine, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, ex] = await Promise.all([
          api.get('/reports/overview'),
          api.get('/exams'),
        ]);
        setOverview(ov.data.data);
        setExams(ex.data.data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ledger-900">Admin overview</h1>
        <p className="text-ledger-400 text-sm mt-1">System-wide attendance and examination status.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Examinations" value={loading ? '—' : overview?.totalExams ?? 0} icon={CalendarClock} />
        <StatCard label="Present (Eligible)" value={loading ? '—' : overview?.totalPresent ?? 0} icon={CheckCircle2} tone="eligible" />
        <StatCard label="Not Eligible" value={loading ? '—' : overview?.totalNotEligible ?? 0} icon={Users} tone="ineligible" />
        <StatCard label="Pending Sync" value={loading ? '—' : overview?.totalPending ?? 0} icon={Clock} tone="pending" />
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ledger-100">
          <h2 className="font-display text-lg text-ledger-900">Upcoming & recent examinations</h2>
          <Link to="/exams" className="text-sm text-seal-dark hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-ledger-100">
          {exams.length === 0 && !loading && (
            <p className="px-6 py-8 text-center text-ledger-400 text-sm">No examinations scheduled yet.</p>
          )}
          {exams.map((exam) => (
            <div key={exam._id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-ledger-900 text-sm">{exam.examName}</p>
                <p className="text-ledger-400 text-xs mt-0.5">
                  {exam.courseCode} · {exam.examRoom} · {new Date(exam.examDate).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={exam.status === 'ongoing' ? 'eligible' : exam.status === 'completed' ? 'neutral' : 'pending'}>
                {exam.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const InvigilatorDashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div>
        <h1 className="font-display text-2xl text-ledger-900">Welcome, {user?.fullName?.split(' ')[0]}</h1>
        <p className="text-ledger-400 text-sm mt-1">Your assigned examinations for today.</p>
      </div>

      <div className="grid gap-4">
        {loading && <p className="text-ledger-400 text-sm">Loading your assignments…</p>}
        {!loading && exams.length === 0 && (
          <div className="bg-white rounded-2xl border border-ledger-100 shadow-card p-8 text-center">
            <p className="text-ledger-400 text-sm">No examinations are currently assigned to you.</p>
          </div>
        )}
        {exams.map((exam) => (
          <div key={exam._id} className="bg-white rounded-2xl border border-ledger-100 shadow-card p-5 flex items-center justify-between fade-up">
            <div>
              <p className="font-display text-lg text-ledger-900">{exam.examName}</p>
              <p className="text-ledger-400 text-sm mt-1">
                {exam.courseCode} · Room {exam.examRoom} · {exam.startTime}–{exam.endTime} · {new Date(exam.examDate).toLocaleDateString()}
              </p>
              <Badge tone={exam.status === 'ongoing' ? 'eligible' : exam.status === 'completed' ? 'neutral' : 'pending'}>
                {exam.status}
              </Badge>
            </div>
            <Link
              to={`/scan?examId=${exam._id}`}
              className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <ScanLine size={16} /> Start attendance
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <InvigilatorDashboard />;
};

export default Dashboard;
