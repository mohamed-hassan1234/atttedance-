import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, School } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const emptyForm = { name: '', faculty: '', department: '' };

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: facultyData }] = await Promise.all([
      api.get('/classes'),
      api.get('/faculties'),
    ]);
    setClasses(data.data);
    setFaculties(facultyData.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const departmentOptions = faculties.find((f) => f.name === form.faculty)?.departments || [];

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({ name: c.name, faculty: c.faculty, department: c.department });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api.put(`/classes/${editingId}`, form);
      else await api.post('/classes', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save class.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this class?')) return;
    await api.delete(`/classes/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Classes</h1>
          <p className="text-ledger-400 text-sm mt-1">Each class belongs to a Faculty and Department. Students pick their class from this list.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> New class
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Class</th>
              <th className="px-6 py-3 font-semibold">Faculty / Dept</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {!loading && classes.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-ledger-400">
                <School className="mx-auto mb-2" size={22} />No classes yet.
              </td></tr>
            )}
            {classes.map((c) => (
              <tr key={c._id} className="hover:bg-ledger-50/60">
                <td className="px-6 py-4 font-medium text-ledger-900">{c.name}</td>
                <td className="px-6 py-4 text-ledger-600">{c.faculty}<p className="text-ledger-400 text-xs mt-0.5">{c.department}</p></td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(c._id)} className="p-2 rounded-lg hover:bg-ineligible/10 text-ineligible"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit class' : 'New class'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save class'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          {error && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Class name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. SE Year 2"
              className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
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
        </form>
      </Modal>
    </div>
  );
};

export default Classes;
