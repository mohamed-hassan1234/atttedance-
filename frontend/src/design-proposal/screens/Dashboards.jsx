import { useState } from 'react';
import { Users, ClipboardList, UserCheck, ShieldCheck, ShieldX, Plus, Download, ScanLine, RefreshCcw, AlertTriangle, Radio, Wifi, WifiOff, ChevronDown, Clock, MapPin } from 'lucide-react';
import { Button, Card, PageHeader, Stat, StatusBadge, Badge, DataTable, Skeleton, EmptyState, Tabs, Progress, Dropdown, MenuItem, cx, usePreview } from '../ui';
import { AreaChart, Donut, Bars } from '../charts';
import { kpis, scans, trend, byExam, exams } from '../data';

const activityCols = [
  { key: 'time', label: 'Time', className: 'tabular-nums text-brand-muted' },
  { key: 'name', label: 'Student', render: (r) => <span><b className="font-semibold">{r.name}</b><span className="block text-xs text-brand-muted">{r.id}</span></span> },
  { key: 'exam', label: 'Examination', className: 'max-w-[220px] truncate' },
  { key: 'result', label: 'Result', render: (r) => <StatusBadge status={r.result} /> },
];

const ExamStatus = ({ dense }) => (
  <Card title="Examination status" subtitle="Today and upcoming" pad={false}>
    <ul className="divide-y divide-slate-100">
      {exams.slice(0, dense ? 5 : 4).map((e) => (
        <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-dark">{e.name}</p>
            <p className="text-xs text-brand-muted">{e.date} · {e.time} · {e.room}</p>
            {e.status !== 'Scheduled' && <div className="mt-2 max-w-xs"><Progress value={(e.present / e.total) * 100} tone="blue" /></div>}
          </div>
          <StatusBadge status={e.status} />
        </li>
      ))}
    </ul>
  </Card>
);

const Split = () => (
  <div className="flex flex-col items-center gap-4 sm:flex-row">
    <Donut size={140} label="95.1%" sub="eligible" parts={[{ name: 'Eligible', v: kpis.eligible, color: '#138653' }, { name: 'Not eligible', v: kpis.notEligible, color: '#B33A3A' }]} />
    <ul className="w-full space-y-3 text-sm">
      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-brand" />Eligible</span><b className="tabular-nums">{kpis.eligible.toLocaleString()}</b></li>
      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-700" />Not eligible</span><b className="tabular-nums">{kpis.notEligible}</b></li>
    </ul>
  </div>
);

const StateSwitch = ({ view, setView }) => (
  <Tabs value={view} onChange={setView} tabs={[{ id: 'ready', label: 'Ready' }, { id: 'loading', label: 'Loading' }, { id: 'empty', label: 'Empty' }, { id: 'error', label: 'Error' }]} />
);

export function AdminDashboard({ concept }) {
  const { toast } = usePreview();
  const [view, setView] = useState('ready');
  const [range, setRange] = useState('This week');

  const kpiCards = [
    <Stat key="s" icon={Users} label="Total students" value={kpis.students.toLocaleString()} hint="Registered in demo set" />,
    <Stat key="e" icon={ClipboardList} label="Examinations" value={kpis.exams} hint="3 live or upcoming today" tone="blue" />,
    <Stat key="a" icon={UserCheck} label="Attendance recorded" value={kpis.attended.toLocaleString()} hint="Across all exams" />,
    <Stat key="el" icon={ShieldCheck} label="Eligible" value={kpis.eligible.toLocaleString()} hint="95.1% of scans" />,
    <Stat key="ne" icon={ShieldX} label="Not eligible" value={kpis.notEligible} hint="Referred to exam office" tone="red" />,
  ];

  const header = (
    <PageHeader
      eyebrow={concept === 'C' ? 'Control center' : 'Overview'}
      title="Admin dashboard"
      subtitle="Attendance and eligibility across all examinations. Figures are demonstration data."
      actions={<>
        <Dropdown trigger={<Button variant="secondary" icon={Clock}>{range}<ChevronDown size={14} /></Button>} align="left">
          {['Today', 'This week', 'This month'].map((r) => <MenuItem key={r} onClick={() => setRange(r)}>{r}</MenuItem>)}
        </Dropdown>
        <Button variant="secondary" icon={Download} onClick={() => toast('CSV export is a preview interaction only')}>Export</Button>
        <Button icon={Plus} onClick={() => toast('Create examination — preview only', 'info')}>New examination</Button>
      </>}
    />
  );

  if (view !== 'ready') {
    return (
      <>
        {header}
        <div className="mb-5"><StateSwitch view={view} setView={setView} /></div>
        <Card pad={false}>
          {view === 'loading' && <Skeleton rows={8} />}
          {view === 'empty' && <EmptyState title="No attendance recorded yet" text="Once an invigilator starts scanning, attendance and eligibility totals appear here." action={<Button icon={ClipboardList}>Create an examination</Button>} />}
          {view === 'error' && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={26} /></span>
              <h4 className="font-semibold text-brand-dark">Couldn't load dashboard data</h4>
              <p className="mt-1 max-w-sm text-sm text-brand-muted">Check the connection and try again. Your data is safe.</p>
              <Button className="mt-5" variant="secondary" icon={RefreshCcw} onClick={() => setView('loading')}>Retry</Button>
            </div>
          )}
        </Card>
      </>
    );
  }

  const trendCard = (
    <Card title="Attendance trend" subtitle={`${range} · scans per day`} action={<Badge tone="slate">Demo data</Badge>}>
      <AreaChart data={trend} color={concept === 'B' ? '#278FC5' : '#138653'} />
    </Card>
  );
  const activity = <Card title="Recent attendance activity" action={<Button variant="ghost" size="sm">View all</Button>} pad={false}><div className="pt-3"><DataTable columns={activityCols} rows={scans.slice(0, 5)} rowKey={(r) => r.time} /></div></Card>;

  if (concept === 'B') {
    return (
      <>
        {header}
        <div className="mb-5"><StateSwitch view={view} setView={setView} /></div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-xl bg-[#0B1220] p-5 text-white sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><Radio size={14} className="animate-pulse" />LIVE NOW</p>
                  <h2 className="mt-1 text-xl font-bold">{exams[0].name}</h2>
                  <p className="text-sm text-slate-300">{exams[0].room} · {exams[0].time}</p>
                </div>
                <Button variant="primary" icon={ScanLine}>Open scanner</Button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <div className="mb-2 flex justify-between text-sm"><span className="text-slate-300">Attendance</span><b className="tabular-nums">142 / 168 · 84.5%</b></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[84.5%] rounded-full bg-brand" /></div>
                </div>
                <div className="flex gap-6 text-sm"><span><b className="block text-xl tabular-nums text-emerald-300">134</b>Eligible</span><span><b className="block text-xl tabular-nums text-red-300">8</b>Not eligible</span></div>
              </div>
            </section>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">{kpiCards.slice(0, 4)}</div>
            {trendCard}
            {activity}
          </div>
          <aside className="space-y-5">
            <Card title="Eligibility split"><Split /></Card>
            <Card title="Attendance by exam"><Bars data={byExam} /></Card>
            <ExamStatus />
          </aside>
        </div>
      </>
    );
  }

  if (concept === 'C') {
    return (
      <>
        {header}
        <div className="mb-5"><StateSwitch view={view} setView={setView} /></div>
        <div className="mb-5 grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {kpiCards.map((k, i) => <div key={i} className="p-4"><Stat {...k.props} compact /></div>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0 space-y-5">
            <Card title="Examinations — live status" pad={false}>
              <div className="pt-3">
                <DataTable dense rowKey={(r) => r.id} columns={[
                  { key: 'name', label: 'Examination', render: (r) => <b className="font-semibold">{r.name}</b> },
                  { key: 'room', label: 'Room' },
                  { key: 'present', label: 'Present', className: 'tabular-nums', render: (r) => `${r.present}/${r.total}` },
                  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]} rows={exams} />
              </div>
            </Card>
            {activity}
          </div>
          <div className="space-y-5">{trendCard}<Card title="Eligibility split"><Split /></Card></div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mb-5"><StateSwitch view={view} setView={setView} /></div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpiCards.slice(0, 4)}</div>
      <div className="mb-5 grid gap-5 lg:grid-cols-[2fr_1fr]">{trendCard}<Card title="Eligible vs Not Eligible"><Split /></Card></div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">{activity}<ExamStatus /></div>
    </>
  );
}

export function InvigilatorDashboard({ go, concept }) {
  const [sel, setSel] = useState(exams[0].id);
  const e = exams.find((x) => x.id === sel);
  const pct = e.total ? (e.present / e.total) * 100 : 0;
  const [offline, setOffline] = useState(false);
  const mine = exams.filter((x) => x.inv.includes('Fadumo Ali') || x.id === 'e1');

  return (
    <>
      <PageHeader eyebrow="Invigilator workspace" title="Good morning, Fadumo" subtitle="Pick your examination, then start scanning. Everything you need during the exam is on this page."
        actions={<Button size="lg" icon={ScanLine} onClick={() => go('scanner')}>Start taking attendance</Button>} />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card title="Assigned examination">
            <label className="mb-1.5 block text-[13px] font-semibold">Select examination</label>
            <div className="relative mb-5">
              <select value={sel} onChange={(ev) => setSel(ev.target.value)} className="min-h-[48px] w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15">
                {mine.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400" />{e.date} · {e.time}</div>
              <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" />{e.room}</div>
              <div className="flex items-center gap-2"><StatusBadge status={e.status} /></div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-end justify-between"><span className="text-sm font-semibold">Attendance progress</span><span className="text-sm tabular-nums text-brand-muted"><b className="text-2xl text-brand-dark">{e.present}</b> / {e.total}</span></div>
              <Progress value={pct} />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 p-3"><b className="block text-xl tabular-nums text-brand-deep">{Math.round(e.present * 0.94)}</b><span className="text-xs text-emerald-800">Eligible</span></div>
                <div className="rounded-lg bg-red-50 p-3"><b className="block text-xl tabular-nums text-red-800">{Math.round(e.present * 0.06)}</b><span className="text-xs text-red-800">Not eligible</span></div>
                <div className="rounded-lg bg-slate-100 p-3"><b className="block text-xl tabular-nums">{e.total - e.present}</b><span className="text-xs text-slate-600">Remaining</span></div>
              </div>
            </div>
          </Card>
          <Card title="Recent student scans" action={<Button variant="ghost" size="sm" onClick={() => go('scanner')}>Open scanner</Button>} pad={false}>
            <div className="pt-3"><DataTable columns={activityCols.filter((c) => c.key !== 'exam')} rows={scans.slice(0, 5)} rowKey={(r) => r.time} /></div>
          </Card>
        </div>
        <div className="space-y-5">
          <button onClick={() => go('scanner')} className={cx('group w-full rounded-xl p-6 text-left text-white transition', concept === 'B' ? 'bg-[#0B1220]' : 'bg-brand-deep hover:bg-brand')}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"><ScanLine size={24} /></span>
            <p className="text-lg font-bold">OCR Student ID scanner</p>
            <p className="mt-1 text-sm text-white/75">Hold the printed Student ID inside the frame. The number is read automatically.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Open scanner →</span>
          </button>
          <Card title="Offline synchronization">
            <div className="flex items-center gap-3">
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-lg', offline ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-brand')}>{offline ? <WifiOff size={20} /> : <Wifi size={20} />}</span>
              <div className="flex-1"><p className="text-sm font-semibold">{offline ? 'Offline — scans are queued' : 'Online — all scans synced'}</p><p className="text-xs text-brand-muted">{offline ? '3 scans waiting to upload' : 'Last sync 09:42:20'}</p></div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setOffline(!offline)}>Toggle preview: {offline ? 'go online' : 'go offline'}</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
