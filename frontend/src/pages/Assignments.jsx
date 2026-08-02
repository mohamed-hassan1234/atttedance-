import { useEffect, useState } from 'react';
import { UserCog, CalendarClock } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const Assignments = () => {
  const [exams, setExams] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalExam, setModalExam] = useState(null); // exam being assigned
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: examData }, { data: userData }] = await Promise.all([
      api.get('/exams'),
      api.get('/users'),
    ]);
    setExams(examData.data);
    setInvigilators(userData.data.filter((u) => u.role === 'invigilator'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAssign = (exam) => {
    setModalExam(exam);
    setSelected((exam.assignedInvigilators || []).map((u) => u._id));
    setError('');
  };

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/exams/${modalExam._id}`, { assignedInvigilators: selected });
      setModalExam(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ledger-900">Assignments</h1>
        <p className="text-ledger-400 text-sm mt-1">Assign invigilators to examinations — one exam, many invigilators.</p>
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Examination</th>
              <th className="px-6 py-3 font-semibold">Date & Room</th>
              <th className="px-6 py-3 font-semibold">Faculty / Dept</th>
              <th className="px-6 py-3 font-semibold">Assigned invigilators</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {!loading && exams.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-ledger-400">
                <CalendarClock className="mx-auto mb-2" size={22} />No examinations yet.
              </td></tr>
            )}
            {exams.map((exam) => (
              <tr key={exam._id} className="hover:bg-ledger-50/60">
                <td className="px-6 py-4">
                  <p className="font-medium text-ledger-900">{exam.examName}</p>
                  <p className="text-ledger-400 text-xs font-mono mt-0.5">{exam.courseCode}</p>
                </td>
                <td className="px-6 py-4 text-ledger-600">
                  {new Date(exam.examDate).toLocaleDateString()} · {exam.startTime}–{exam.endTime}
                  <p className="text-ledger-400 text-xs mt-0.5">{exam.examRoom}</p>
                </td>
                <td className="px-6 py-4 text-ledger-600">
                  {exam.faculty}<p className="text-ledger-400 text-xs mt-0.5">{exam.department}</p>
                </td>
                <td className="px-6 py-4 text-ledger-600 text-xs">
                  {exam.assignedInvigilators?.length
                    ? exam.assignedInvigilators.map((u) => u.fullName).join(', ')
                    : <span className="text-ledger-400">Unassigned</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => openAssign(exam)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-ledger-100 text-ledger-700 hover:bg-ledger-200"
                    >
                      <UserCog size={14} /> Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modalExam}
        onClose={() => setModalExam(null)}
        title={modalExam ? `Assign invigilators — ${modalExam.examName}` : ''}
        footer={
          <>
            <button onClick={() => setModalExam(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save assignment'}
            </button>
          </>
        }
      >
        {error && <div className="mb-4 bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
        {invigilators.length === 0 && (
          <p className="text-sm text-ledger-400">No invigilator accounts yet — create one under Manage Users.</p>
        )}
        <div className="grid sm:grid-cols-2 gap-2">
          {invigilators.map((inv) => (
            <label key={inv._id} className="flex items-center gap-2 text-sm text-ledger-600 px-3 py-2 rounded-lg hover:bg-ledger-50">
              <input type="checkbox" checked={selected.includes(inv._id)} onChange={() => toggle(inv._id)} />
              {inv.fullName}
              <Badge tone="neutral">{inv.username}</Badge>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Assignments;
