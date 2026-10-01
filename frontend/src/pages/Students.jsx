import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, QrCode, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const emptyForm = { studentId: '', fullName: '', faculty: '', department: '', className: '', feeStatus: 'Cleared', absenceCount: 0, email: '' };

const Students = () => {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [qrStudent, setQrStudent] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: facultyData }, { data: classData }] = await Promise.all([
      api.get('/students'),
      api.get('/faculties'),
      api.get('/classes'),
    ]);
    setStudents(data.data);
    setFaculties(facultyData.data);
    setClasses(classData.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const departmentOptions = faculties.find((f) => f.name === form.faculty)?.departments || [];
  const classOptions = classes.filter((c) => c.faculty === form.faculty && c.department === form.department);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({ studentId: s.studentId, fullName: s.fullName, faculty: s.faculty, department: s.department, className: s.className || '', feeStatus: s.feeStatus, absenceCount: s.absenceCount || 0, email: s.email || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api.put(`/students/${editingId}`, form);
      else await api.post('/students', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save student record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this student record?')) return;
    await api.delete(`/students/${id}`);
    load();
  };

  // The student's QR code holds only their Student ID, which is what the
  // invigilator camera reads.
  const openQr = async (s) => {
    setQrStudent(s);
    setQrPayload(s.studentId);
    setQrDataUrl('');
    setQrError('');
    setQrLoading(true);
    try {
      setQrDataUrl(await QRCode.toDataURL(s.studentId, { width: 300, margin: 2 }));
    } catch {
      setQrError('Could not generate this student QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrStudent) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${qrStudent.studentId}-qr-code.png`;
    link.click();
  };

  const printQr = () => {
    if (!qrDataUrl || !qrStudent) return;
    const card = `
      <html>
        <head>
          <title>${qrStudent.studentId} QR Code</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { width: 320px; border: 1px solid #d7dce8; border-radius: 14px; padding: 24px; text-align: center; }
            .logo { width: 48px; height: 48px; border-radius: 10px; background: #B8862E; color: #0B1220; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 12px; }
            h1 { font-size: 20px; margin: 8px 0 4px; }
            p { margin: 4px 0; color: #2B3E68; }
            img { width: 240px; height: 240px; margin: 16px auto; display: block; }
            .small { font-size: 12px; color: #6B7FA8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SE</div>
            <h1>${qrStudent.fullName}</h1>
            <p>${qrStudent.studentId}</p>
            <img src="${qrDataUrl}" alt="Student QR code" />
            <p class="small">Scan to verify student identity</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>`;
    const win = window.open('', '_blank', 'width=420,height=640');
    win.document.write(card);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Students</h1>
          <p className="text-ledger-400 text-sm mt-1">Locally cached directory, normally sourced from the University API.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> New student
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
              <th className="px-6 py-3 font-semibold">Student</th>
              <th className="px-6 py-3 font-semibold">Faculty / Dept</th>
              <th className="px-6 py-3 font-semibold">Fee status</th>
              <th className="px-6 py-3 font-semibold">Absences</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-100">
            {!loading && students.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-ledger-400">
                <GraduationCap className="mx-auto mb-2" size={22} />No students yet.
              </td></tr>
            )}
            {students.map((s) => (
              <tr key={s._id} className="hover:bg-ledger-50/60">
                <td className="px-6 py-4">
                  <p className="font-medium text-ledger-900">{s.fullName}</p>
                  <p className="text-ledger-400 text-xs font-mono mt-0.5">{s.studentId}</p>
                </td>
                <td className="px-6 py-4 text-ledger-600">
                  {s.faculty}<p className="text-ledger-400 text-xs mt-0.5">{s.department}{s.className ? ` · ${s.className}` : ''}</p>
                </td>
                <td className="px-6 py-4"><Badge tone={s.feeStatus === 'Cleared' ? 'eligible' : 'ineligible'}>{s.feeStatus}</Badge></td>
                <td className="px-6 py-4"><Badge tone={(s.absenceCount || 0) > 3 ? 'ineligible' : 'neutral'}>{s.absenceCount || 0}</Badge></td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openQr(s)} title="Show QR code" className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><QrCode size={15} /></button>
                    <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-ledger-100 text-ledger-500"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(s._id)} className="p-2 rounded-lg hover:bg-ineligible/10 text-ineligible"><Trash2 size={15} /></button>
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
        title={editingId ? 'Edit student' : 'New student'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save student'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          {error && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Student ID" value={form.studentId} onChange={(v) => setForm({ ...form, studentId: v })} required disabled={!!editingId} />
            <Field label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Faculty</label>
              <select
                required
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value, department: '', className: '' })}
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
                onChange={(e) => setForm({ ...form, department: e.target.value, className: '' })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 disabled:bg-ledger-50 disabled:text-ledger-400"
              >
                <option value="" disabled>{form.faculty ? 'Select department' : 'Select a faculty first'}</option>
                {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Class</label>
              <select
                disabled={!form.department}
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 disabled:bg-ledger-50 disabled:text-ledger-400"
              >
                <option value="">{form.department ? (classOptions.length ? 'Select class (optional)' : 'No classes for this department') : 'Select a department first'}</option>
                {classOptions.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Fee status (this month)</label>
              <select value={form.feeStatus} onChange={(e) => setForm({ ...form, feeStatus: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 text-sm">
                <option value="Cleared">Cleared</option>
                <option value="Not Cleared">Not Cleared</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">Absences</label>
              <input
                type="number"
                min="0"
                value={form.absenceCount}
                onChange={(e) => setForm({ ...form, absenceCount: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
              />
              <p className="text-[11px] text-ledger-400 mt-1">More than 3 blocks the student from being marked present.</p>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={!!qrStudent} onClose={() => setQrStudent(null)} title="Student profile & QR code" maxWidth="max-w-xl">
        {qrStudent && (
          <div className="grid md:grid-cols-[1fr_auto] gap-5">
            <div className="space-y-4">
              <div>
                <p className="font-display text-xl text-ledger-900">{qrStudent.fullName}</p>
                <p className="text-ledger-400 text-xs font-mono mt-0.5">{qrStudent.studentId}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Faculty" value={qrStudent.faculty} />
                <Info label="Department" value={qrStudent.department} />
                <Info label="Class" value={qrStudent.className || 'Not set'} />
                <Info label="Fee status" value={qrStudent.feeStatus} />
                <Info label="Absences" value={qrStudent.absenceCount || 0} />
              </div>
              {qrError && <div className="bg-ineligible/10 text-ineligible text-sm rounded-xl px-3.5 py-2.5">{qrError}</div>}
              <div className="flex flex-wrap gap-2">
                <button onClick={printQr} disabled={!qrDataUrl} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-ledger-200 text-ledger-600 hover:bg-ledger-50 disabled:opacity-50">
                  <Printer size={15} /> Print
                </button>
                <button onClick={downloadQr} disabled={!qrDataUrl} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-ledger-200 text-ledger-600 hover:bg-ledger-50 disabled:opacity-50">
                  <Download size={15} /> Download
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              {qrLoading && !qrDataUrl && <div className="w-[260px] h-[260px] rounded-xl bg-ledger-50 flex items-center justify-center text-ledger-400 text-sm">Generating QR…</div>}
              {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ${qrStudent.studentId}`} className="w-[260px] h-[260px] rounded-xl border border-ledger-100" />}
              <p className="text-ledger-400 text-xs max-w-[260px]">Scan with the invigilator QR scanner. The QR contains only the Student ID.</p>
              <span className="sr-only">{qrPayload}</span>
            </div>
          </div>
        )}
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

const Info = ({ label, value }) => (
  <div className="rounded-xl bg-ledger-50 border border-ledger-100 px-3.5 py-3">
    <p className="text-[11px] uppercase tracking-wide text-ledger-400 font-semibold">{label}</p>
    <p className="text-ledger-700 mt-1">{value}</p>
  </div>
);

export default Students;
