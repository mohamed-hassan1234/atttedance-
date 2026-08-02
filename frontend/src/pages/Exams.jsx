import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const emptyForm = {
  examName: '', courseCode: '', examDate: '', startTime: '', endTime: '',
  examRoom: '', faculty: '', department: '', requireFeeCheck: true, status: 'scheduled',
};

const Exams = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [exams, setExams] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: facultyData }] = await Promise.all([
      api.get(isAdmin ? '/exams' : '/exams?mine=true'),
      api.get('/faculties'),
    ]);
    setExams(data.data);
    setFaculties(facultyData.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const departmentOptions = faculties.find((f) => f.name === form.faculty)?.departments || [];

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (exam) => {
    setEditingId(exam._id);
    setForm({
      examName: exam.examName, courseCode: exam.courseCode,
      examDate: exam.examDate.slice(0, 10), startTime: exam.startTime, endTime: exam.endTime,
      examRoom: exam.examRoom, faculty: exam.faculty, department: exam.department,
      requireFeeCheck: exam.requireFeeCheck, status: exam.status,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/exams/${editingId}`, form);
      } else {
        await api.post('/exams', form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save examination.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this examination? This cannot be undone.')) return;
    await api.delete(`/exams/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Examinations</h1>
          <p className="text-ledger-400 text-sm mt-1">All scheduled and past examination sessions.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} /> New examination
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Examination</th>
              <th className="px-6 py-3 font-semibold">Date & Room</th>
              <th className="px-6 py-3 font-semibold">Faculty / Dept</th>
              <th className="px-6 py-3 font-semibold">Invigilators</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              {isAdmin && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {!loading && exams.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-ledger-400">
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
                  <Badge tone={exam.status === 'ongoing' ? 'eligible' : exam.status === 'completed' ? 'neutral' : exam.status === 'cancelled' ? 'ineligible' : 'pending'}>
                    {exam.status}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(exam)} className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(exam._id)} className="p-2 rounded-lg hover:bg-ineligible/10 text-ineligible"><Trash2 size={15} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit examination' : 'New examination'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save examination'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          {error && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Exam name" value={form.examName} onChange={(v) => setForm({ ...form, examName: v })} required />
            <Field label="Course code" value={form.courseCode} onChange={(v) => setForm({ ...form, courseCode: v })} required />
            <Field type="date" label="Exam date" value={form.examDate} onChange={(v) => setForm({ ...form, examDate: v })} required />
            <Field label="Exam room" value={form.examRoom} onChange={(v) => setForm({ ...form, examRoom: v })} required />
            <Field type="time" label="Start time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required />
            <Field type="time" label="End time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} required />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Faculty</label>
              <select
                required
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value, department: '' })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
              >
                <option value="" disabled>Select faculty</option>
                {faculties.map((f) => <option key={f._id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Department</label>
              <select
                required
                disabled={!form.faculty}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 disabled:bg-ledger-50 disabled:text-ledger-400"
              >
                <option value="" disabled>{form.faculty ? 'Select department' : 'Select a faculty first'}</option>
                {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-ledger-600">
              <input type="checkbox" checked={form.requireFeeCheck} onChange={(e) => setForm({ ...form, requireFeeCheck: e.target.checked })} />
              Require fee clearance check
            </label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', required }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">{label}</label>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
    />
  </div>
);

export default Exams;
