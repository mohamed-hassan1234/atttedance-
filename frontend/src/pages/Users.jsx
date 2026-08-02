import { useEffect, useState } from 'react';
import { Plus, Pencil, KeyRound, UserX, UserCheck, Search } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const emptyForm = {
  fullName: '',
  invigilatorId: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'invigilator',
  isActive: true,
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwModal, setPwModal] = useState(null); // user id
  const [newPassword, setNewPassword] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get('/users', { params });
    setUsers(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, statusFilter]); // eslint-disable-line

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingId(u._id);
    setForm({
      fullName: u.fullName,
      invigilatorId: u.invigilatorId || '',
      username: u.username,
      email: u.email,
      phone: u.phone || '',
      password: '',
      confirmPassword: '',
      role: u.role,
      isActive: u.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!editingId && form.password !== form.confirmPassword) {
        setError('Password and confirm password must match.');
        setSaving(false);
        return;
      }
      if (editingId) {
        await api.put(`/users/${editingId}`, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          invigilatorId: form.role === 'invigilator' ? form.invigilatorId : '',
          isActive: form.isActive,
        });
      } else {
        const { confirmPassword, ...payload } = form;
        await api.post('/users', {
          ...payload,
          invigilatorId: payload.role === 'invigilator' ? payload.invigilatorId : undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u._id}`, { isActive: !u.isActive });
    load();
  };

  const handleResetPassword = async () => {
    await api.put(`/users/${pwModal}/reset-password`, { newPassword });
    setPwModal(null);
    setNewPassword('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Manage users</h1>
          <p className="text-ledger-400 text-sm mt-1">Create and manage Admin and Invigilator accounts.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> Register Invigilator
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-x-auto">
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-b border-ledger-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ledger-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username, email, or invigilator ID"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-ledger-200 text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-ledger-200 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Username / Email</th>
              <th className="px-6 py-3 font-semibold">Staff ID / Phone</th>
              <th className="px-6 py-3 font-semibold">Role</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {!loading && users.map((u) => (
              <tr key={u._id} className="hover:bg-ledger-50/60">
                <td className="px-6 py-4 font-medium text-ledger-900">{u.fullName}</td>
                <td className="px-6 py-4 text-ledger-600">
                  <p className="font-mono text-xs">{u.username}</p>
                  <p className="text-ledger-400 text-xs">{u.email}</p>
                </td>
                <td className="px-6 py-4 text-ledger-600">
                  <p className="font-mono text-xs">{u.invigilatorId || '—'}</p>
                  <p className="text-ledger-400 text-xs">{u.phone || 'No phone'}</p>
                </td>
                <td className="px-6 py-4"><Badge tone={u.role === 'admin' ? 'seal' : 'neutral'}>{u.role}</Badge></td>
                <td className="px-6 py-4"><Badge tone={u.isActive ? 'eligible' : 'ineligible'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge></td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(u)} title="Edit" className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><Pencil size={15} /></button>
                    <button onClick={() => setPwModal(u._id)} title="Reset password" className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><KeyRound size={15} /></button>
                    <button onClick={() => toggleActive(u)} title={u.isActive ? 'Deactivate' : 'Reactivate'} className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500">
                      {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
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
        title={editingId ? 'Edit user' : 'Register Invigilator'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save user'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          {error && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
          <Field label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
          {form.role === 'invigilator' && (
            <Field label="Invigilator ID" value={form.invigilatorId} onChange={(v) => setForm({ ...form, invigilatorId: v })} required disabled={!!editingId} />
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required disabled={!!editingId} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          </div>
          <Field label="Phone number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          {!editingId && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
              <Field label="Confirm password" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} required />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 text-sm">
              <option value="invigilator">Invigilator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ledger-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-ledger-200 text-seal focus:ring-seal/40"
            />
            Active account
          </label>
        </form>
      </Modal>

      <Modal
        open={!!pwModal}
        onClose={() => setPwModal(null)}
        title="Reset password"
        footer={
          <>
            <button onClick={() => setPwModal(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleResetPassword} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white">Reset password</button>
          </>
        }
      >
        <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} required />
      </Modal>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', required, disabled }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">{label}</label>
    <input
      type={type}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 disabled:bg-ledger-50 disabled:text-ledger-400"
    />
  </div>
);

export default Users;
