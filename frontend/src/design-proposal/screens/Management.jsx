import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, UserPlus, CalendarPlus, Link2, Filter, MoreHorizontal } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchBox, Select, StatusBadge, Tabs, Skeleton, Dropdown, MenuItem, usePreview } from '../ui';
import { students, exams, users } from '../data';

const RowActions = ({ onEdit, onRemove }) => (
  <div className="flex justify-end gap-1">
    <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit} aria-label="Edit" />
    <Dropdown trigger={<Button variant="ghost" size="sm" icon={MoreHorizontal} aria-label="More" />}>
      <MenuItem icon={Pencil} onClick={onEdit}>Edit</MenuItem>
      <MenuItem icon={Trash2} danger onClick={onRemove}>Remove (preview)</MenuItem>
    </Dropdown>
  </div>
);

export function StudentsScreen() {
  const { toast } = usePreview();
  const [q, setQ] = useState('');
  const [faculty, setFaculty] = useState('All');
  const [fee, setFee] = useState('All');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const rows = useMemo(() => students.filter((s) =>
    (faculty === 'All' || s.faculty === faculty) && (fee === 'All' || s.fee === fee) &&
    (`${s.name} ${s.id}`.toLowerCase().includes(q.toLowerCase()))), [q, faculty, fee]);
  const faculties = ['All', ...new Set(students.map((s) => s.faculty))];

  return (
    <>
      <PageHeader title="Students" subtitle="Registered students and fee status. Demo records only."
        actions={<><Button variant="secondary" icon={Filter} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1200); }}>Show loading</Button><Button icon={UserPlus} onClick={() => setOpen(true)}>Add student</Button></>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px_180px]">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name or ID (e.g. HU00004698)" />
          <Select value={faculty} onChange={(e) => setFaculty(e.target.value)} aria-label="Faculty">{faculties.map((f) => <option key={f}>{f}</option>)}</Select>
          <Select value={fee} onChange={(e) => setFee(e.target.value)} aria-label="Fee status">{['All', 'Cleared', 'Balance due'].map((f) => <option key={f}>{f}</option>)}</Select>
        </div>
        {loading ? <Skeleton rows={7} /> : rows.length === 0 ? (
          <EmptyState title="No students match your search" text="Try a different name, ID or clear the filters." action={<Button variant="secondary" onClick={() => { setQ(''); setFaculty('All'); setFee('All'); }}>Clear filters</Button>} />
        ) : (
          <DataTable rowKey={(r) => r.id} rows={rows} columns={[
            { key: 'id', label: 'Student ID', className: 'font-mono text-[13px] font-semibold' },
            { key: 'name', label: 'Name', render: (r) => <b className="font-semibold">{r.name}</b> },
            { key: 'faculty', label: 'Faculty' },
            { key: 'dept', label: 'Department' },
            { key: 'fee', label: 'Fee status', render: (r) => <StatusBadge status={r.fee} /> },
            { key: 'a', label: '', className: 'w-24 text-right', render: () => <RowActions onEdit={() => setOpen(true)} onRemove={() => toast('Removal is disabled in the preview', 'info')} /> },
          ]} />
        )}
        <Pagination page={page} pages={5} onPage={setPage} total={4286} />
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add student"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { setOpen(false); toast('Nothing was saved — design preview'); }}>Save student</Button></>}>
        <Field label="Student ID" hint="Format: HU followed by 8 digits"><Input placeholder="HU00000000" className="font-mono" /></Field>
        <Field label="Full name"><Input placeholder="Student full name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Faculty"><Select>{faculties.slice(1).map((f) => <option key={f}>{f}</option>)}</Select></Field>
          <Field label="Fee status"><Select><option>Cleared</option><option>Balance due</option></Select></Field>
        </div>
      </Modal>
    </>
  );
}

export function ExamsScreen() {
  const { toast } = usePreview();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(false);
  const rows = exams.filter((e) => (status === 'All' || e.status === status) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Examinations" subtitle="Schedule, rooms, invigilators and live status." actions={<Button icon={CalendarPlus} onClick={() => setOpen(true)}>New examination</Button>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px]">
          <SearchBox value={q} onChange={setQ} placeholder="Search examinations" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">{['All', 'Live', 'Scheduled', 'Completed'].map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
        {rows.length === 0 ? <EmptyState title="No examinations found" text="Adjust the status filter or search term." /> : (
          <DataTable rowKey={(r) => r.id} rows={rows} columns={[
            { key: 'name', label: 'Examination', render: (r) => <span><b className="font-semibold">{r.name}</b><span className="block text-xs text-brand-muted">{r.faculty} · {r.dept}</span></span> },
            { key: 'date', label: 'Date & time', render: (r) => <span>{r.date}<span className="block text-xs text-brand-muted">{r.time} · {r.room}</span></span> },
            { key: 'inv', label: 'Invigilators', render: (r) => r.inv.join(', ') },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'a', label: '', className: 'w-24 text-right', render: () => <RowActions onEdit={() => setOpen(true)} onRemove={() => toast('Removal is disabled in the preview', 'info')} /> },
          ]} />
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Examination"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { setOpen(false); toast('Nothing was saved — design preview'); }}>Save</Button></>}>
        <Field label="Name"><Input placeholder="e.g. Database Systems — Final" /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><Input type="date" /></Field><Field label="Time"><Input placeholder="09:00–11:00" /></Field></div>
        <Field label="Status"><Select><option>Scheduled</option><option>Live</option><option>Completed</option></Select></Field>
      </Modal>
    </>
  );
}

export function UsersScreen() {
  const { toast } = usePreview();
  const [tab, setTab] = useState('users');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [open, setOpen] = useState(false);
  const rows = users.filter((u) => (role === 'All' || u.role === role) && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Users & assignments" subtitle="Manage staff accounts and who invigilates which examination."
        actions={tab === 'users' ? <Button icon={UserPlus} onClick={() => setOpen(true)}>Add user</Button> : <Button icon={Link2} onClick={() => setOpen(true)}>Assign invigilator</Button>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'users', label: 'Users' }, { id: 'assign', label: 'Assignments' }]} /></div>
      <Card pad={false}>
        {tab === 'users' ? (
          <>
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search users" />
              <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">{['All', 'Admin', 'Invigilator'].map((s) => <option key={s}>{s}</option>)}</Select>
            </div>
            {rows.length ? <DataTable rowKey={(r) => r.email} rows={rows} columns={[
              { key: 'name', label: 'User', render: (r) => <span><b className="font-semibold">{r.name}</b><span className="block text-xs text-brand-muted">{r.email}</span></span> },
              { key: 'role', label: 'Role', render: (r) => <StatusBadge status={r.role} /> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'last', label: 'Last active', className: 'text-brand-muted' },
              { key: 'a', label: '', className: 'w-24 text-right', render: () => <RowActions onEdit={() => setOpen(true)} onRemove={() => toast('Disabled in the preview', 'info')} /> },
            ]} /> : <EmptyState title="No users found" text="Try another search or role." />}
          </>
        ) : (
          <DataTable rowKey={(r) => r.id} rows={exams} columns={[
            { key: 'name', label: 'Examination', render: (r) => <b className="font-semibold">{r.name}</b> },
            { key: 'date', label: 'When', render: (r) => `${r.date} · ${r.time}` },
            { key: 'inv', label: 'Assigned invigilators', render: (r) => <span className="flex flex-wrap gap-1.5">{r.inv.map((n) => <span key={n} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{n}</span>)}</span> },
            { key: 'a', label: '', className: 'w-24 text-right', render: () => <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Manage</Button> },
          ]} />
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={tab === 'users' ? 'User' : 'Assign invigilator'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { setOpen(false); toast('Nothing was saved — design preview'); }}>Save</Button></>}>
        {tab === 'users' ? <>
          <Field label="Full name"><Input placeholder="Full name" /></Field>
          <Field label="Role"><Select><option>Invigilator</option><option>Admin</option></Select></Field>
        </> : <>
          <Field label="Examination"><Select>{exams.map((e) => <option key={e.id}>{e.name}</option>)}</Select></Field>
          <Field label="Invigilator"><Select>{users.filter((u) => u.role === 'Invigilator').map((u) => <option key={u.email}>{u.name}</option>)}</Select></Field>
        </>}
      </Modal>
    </>
  );
}
