import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Landmark, X } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import TableSkeleton from '../components/TableSkeleton';
import { useToast } from '../context/ToastContext';

const emptyForm = { name: '', departments: [] };

const Faculties = () => {
  const toast = useToast();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deptInput, setDeptInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/faculties');
    setFaculties(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDeptInput(''); setError(''); setModalOpen(true); };
  const openEdit = (f) => {
    setEditingId(f._id);
    setForm({ name: f.name, departments: [...f.departments] });
    setDeptInput('');
    setError('');
    setModalOpen(true);
  };

  const addDepartment = () => {
    const value = deptInput.trim();
    if (!value || form.departments.includes(value)) return;
    setForm({ ...form, departments: [...form.departments, value] });
    setDeptInput('');
  };

  const removeDepartment = (d) => {
    setForm({ ...form, departments: form.departments.filter((x) => x !== d) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api.put(`/faculties/${editingId}`, form);
      else await api.post('/faculties', form);
      setModalOpen(false);
      toast.success(editingId ? 'Faculty updated.' : 'Faculty created.');
      load();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not save faculty.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/faculties/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this faculty.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-semibold tracking-tight text-2xl text-ledger-900">Faculties &amp; Departments</h1>
          <p className="text-ledger-400 text-sm mt-1">Shared list used by Students, Classes, and Examinations.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white text-sm font-medium px-4 min-h-[44px] rounded-lg transition-colors">
          <Plus size={16} /> New faculty
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ledger-100 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Faculty</th>
              <th className="px-6 py-3 font-semibold">Departments</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {loading && <TableSkeleton rows={4} cols={3} />}
            {!loading && faculties.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-ledger-400">
                <Landmark className="mx-auto mb-2" size={22} />No faculties yet.
              </td></tr>
            )}
            {!loading && faculties.map((f) => (
              <tr key={f._id} className="hover:bg-ledger-50/60">
                <td className="px-6 py-4 font-medium text-ledger-900">{f.name}</td>
                <td className="px-6 py-4 text-ledger-600">
                  <div className="flex flex-wrap gap-1.5">
                    {f.departments.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-full bg-ledger-100 text-ledger-600 text-xs">{d}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(f)} className="p-2.5 rounded-lg hover:bg-ledger-100 text-ledger-500"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteTarget(f)} className="p-2.5 rounded-lg hover:bg-ineligible/10 text-ineligible"><Trash2 size={15} /></button>
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
        title={editingId ? 'Edit faculty' : 'New faculty'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 min-h-[40px] rounded-lg text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 min-h-[40px] rounded-lg text-sm font-medium bg-brand hover:bg-brand-deep text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save faculty'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          {error && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Faculty name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Departments</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDepartment(); } }}
                placeholder="e.g. Software Engineering"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button type="button" onClick={addDepartment} className="px-4 min-h-[44px] rounded-lg text-sm font-medium bg-ledger-100 text-ledger-700 hover:bg-ledger-200">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.departments.map((d) => (
                <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-ledger-100 text-ledger-700 text-xs">
                  {d}
                  <button type="button" onClick={() => removeDepartment(d)} className="text-ledger-400 hover:text-ineligible"><X size={12} /></button>
                </span>
              ))}
              {form.departments.length === 0 && <p className="text-ledger-400 text-xs">No departments added yet.</p>}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove faculty?"
        message={deleteTarget ? `Classes and records referencing "${deleteTarget.name}" will keep their old text, but new ones can no longer select it.` : ''}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Faculties;
