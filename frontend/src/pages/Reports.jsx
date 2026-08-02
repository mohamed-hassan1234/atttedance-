import { useEffect, useState } from 'react';
import { Download, FileBarChart2, QrCode } from 'lucide-react';
import api from '../services/api';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';

const Reports = () => {
  const [exams, setExams] = useState([]);
  const [examFilter, setExamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [qrRecords, setQrRecords] = useState([]);
  const [qrStatusFilter, setQrStatusFilter] = useState('');
  const [qrStudentFilter, setQrStudentFilter] = useState('');
  const [qrInvigilatorFilter, setQrInvigilatorFilter] = useState('');
  const [qrDateFilter, setQrDateFilter] = useState('');
  const [invigilators, setInvigilators] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    const params = {};
    if (examFilter) params.exam = examFilter;
    if (statusFilter) params.eligibilityStatus = statusFilter;
    const { data } = await api.get('/attendance', { params });
    setRecords(data.data);
  };

  const loadQrRecords = async () => {
    const params = {};
    if (qrStatusFilter) params.scanStatus = qrStatusFilter;
    if (qrStudentFilter) params.studentId = qrStudentFilter;
    if (qrInvigilatorFilter) params.invigilator = qrInvigilatorFilter;
    if (qrDateFilter) params.date = qrDateFilter;
    const { data } = await api.get('/qr/scans', { params });
    setQrRecords(data.data);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [ex, ov, dept] = await Promise.all([
        api.get('/exams'),
        api.get('/reports/overview'),
        api.get('/reports/by-department'),
      ]);
      const users = await api.get('/users', { params: { role: 'invigilator' } });
      setExams(ex.data.data);
      setOverview(ov.data.data);
      setByDept(dept.data.data);
      setInvigilators(users.data.data);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => { loadRecords(); }, [examFilter, statusFilter]); // eslint-disable-line
  useEffect(() => { loadQrRecords(); }, [qrStatusFilter, qrStudentFilter, qrInvigilatorFilter, qrDateFilter]); // eslint-disable-line

  const exportCsv = () => {
    const header = ['Student ID', 'Student Name', 'Exam', 'Timestamp', 'Eligibility', 'Sync Status'];
    const rows = records.map((r) => [
      r.studentIdSnapshot,
      r.student?.fullName || '',
      r.exam?.examName || '',
      new Date(r.timeStamp).toLocaleString(),
      r.eligibilityStatus,
      r.syncStatus,
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Reports & statistics</h1>
          <p className="text-ledger-400 text-sm mt-1">Attendance records across all examinations.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total records" value={overview?.totalRecords ?? '—'} />
        <StatCard label="Eligible" value={overview?.totalPresent ?? '—'} tone="eligible" />
        <StatCard label="Not eligible" value={overview?.totalNotEligible ?? '—'} tone="ineligible" />
        <StatCard label="Pending sync" value={overview?.totalPending ?? '—'} tone="pending" />
      </div>

      {byDept.length > 0 && (
        <div className="bg-white rounded-2xl border border-ledger-100 shadow-card p-6">
          <h2 className="font-display text-lg text-ledger-900 mb-4">Attendance by faculty / department</h2>
          <div className="space-y-3">
            {byDept.map((d) => {
              const total = d.total || 1;
              const pct = Math.round((d.eligible / total) * 100);
              return (
                <div key={`${d._id.faculty}-${d._id.department}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ledger-700">{d._id.faculty} — {d._id.department}</span>
                    <span className="text-ledger-400">{d.eligible}/{d.total} eligible</span>
                  </div>
                  <div className="h-2 bg-ledger-100 rounded-full overflow-hidden">
                    <div className="h-full bg-eligible rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-ledger-100">
          <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
            <option value="">All examinations</option>
            {exams.map((ex) => <option key={ex._id} value={ex._id}>{ex.examName}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
            <option value="">All eligibility</option>
            <option value="Eligible">Eligible</option>
            <option value="Not Eligible">Not Eligible</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Exam</th>
                <th className="px-6 py-3 font-semibold">Recorded at</th>
                <th className="px-6 py-3 font-semibold">Eligibility</th>
                <th className="px-6 py-3 font-semibold">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ledger-100">
              {!loading && records.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-ledger-400">
                  <FileBarChart2 className="mx-auto mb-2" size={22} />No attendance records match these filters.
                </td></tr>
              )}
              {records.map((r) => (
                <tr key={r._id} className="hover:bg-ledger-50/60">
                  <td className="px-6 py-4">
                    <p className="font-medium text-ledger-900">{r.student?.fullName}</p>
                    <p className="text-ledger-400 text-xs font-mono">{r.studentIdSnapshot}</p>
                  </td>
                  <td className="px-6 py-4 text-ledger-600">{r.exam?.examName}</td>
                  <td className="px-6 py-4 text-ledger-600">{new Date(r.timeStamp).toLocaleString()}</td>
                  <td className="px-6 py-4"><Badge tone={r.eligibilityStatus === 'Eligible' ? 'eligible' : 'ineligible'}>{r.eligibilityStatus}</Badge></td>
                  <td className="px-6 py-4"><Badge tone={r.syncStatus === 'Synced' ? 'neutral' : 'pending'}>{r.syncStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ledger-100">
          <div>
            <h2 className="font-display text-lg text-ledger-900">QR scan records</h2>
            <p className="text-ledger-400 text-xs mt-0.5">Audit history showing which Invigilator scanned each QR code.</p>
          </div>
          <QrCode size={18} className="text-ledger-400" />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-ledger-100">
          <input
            value={qrStudentFilter}
            onChange={(e) => setQrStudentFilter(e.target.value)}
            placeholder="Student ID"
            className="px-3 py-2 rounded-lg border border-ledger-200 text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
          />
          <select value={qrInvigilatorFilter} onChange={(e) => setQrInvigilatorFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
            <option value="">All invigilators</option>
            {invigilators.map((u) => <option key={u._id} value={u._id}>{u.fullName}</option>)}
          </select>
          <select value={qrStatusFilter} onChange={(e) => setQrStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
            <option value="">All scan statuses</option>
            <option value="Successful">Successful</option>
            <option value="Invalid QR">Invalid QR</option>
            <option value="QR deactivated">QR deactivated</option>
            <option value="Duplicate scan">Duplicate scan</option>
            <option value="Access denied">Access denied</option>
          </select>
          <input
            type="date"
            value={qrDateFilter}
            onChange={(e) => setQrDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-ledger-200 text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Invigilator</th>
                <th className="px-6 py-3 font-semibold">Scanned at</th>
                <th className="px-6 py-3 font-semibold">Result</th>
                <th className="px-6 py-3 font-semibold">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ledger-100">
              {qrRecords.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-ledger-400">
                  <QrCode className="mx-auto mb-2" size={22} />No QR scan records match these filters.
                </td></tr>
              )}
              {qrRecords.map((r) => (
                <tr key={r._id} className="hover:bg-ledger-50/60">
                  <td className="px-6 py-4">
                    <p className="font-medium text-ledger-900">{r.student?.fullName || 'Unknown student'}</p>
                    <p className="text-ledger-400 text-xs font-mono">{r.studentIdSnapshot || 'No student ID'}</p>
                  </td>
                  <td className="px-6 py-4 text-ledger-600">
                    <p>{r.invigilator?.fullName || r.invigilatorNameSnapshot}</p>
                    <p className="text-ledger-400 text-xs font-mono">{r.invigilator?.invigilatorId || r.invigilator?.username}</p>
                  </td>
                  <td className="px-6 py-4 text-ledger-600">{new Date(r.scannedAt).toLocaleString()}</td>
                  <td className="px-6 py-4"><Badge tone={r.scanStatus === 'Successful' ? 'eligible' : r.scanStatus === 'Duplicate scan' ? 'pending' : 'ineligible'}>{r.scanStatus}</Badge></td>
                  <td className="px-6 py-4 text-ledger-400 text-xs max-w-xs truncate" title={r.deviceInfo}>{r.deviceInfo || 'Not captured'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
