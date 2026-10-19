import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, PageHeader, Select, Skeleton, StatusBadge, Tabs, usePreview } from '../ui';
import { Bars, Donut } from '../charts';
import { byExam, exams, kpis, scans } from '../data';

export default function ReportsScreen() {
  const { toast } = usePreview();
  const [tab, setTab] = useState('summary');
  const [exam, setExam] = useState('All');
  const [view, setView] = useState('ready');
  const rows = scans.filter((s) => exam === 'All' || s.exam.startsWith(exam));

  return (
    <>
      <PageHeader title="Reports & analytics" subtitle="Attendance outcomes and a complete scan audit trail. Demo data."
        actions={<Button icon={Download} onClick={() => toast('Preview only — no CSV was generated', 'info')}>Export CSV</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_220px]">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'summary', label: 'Summary' }, { id: 'audit', label: 'Scan audit' }]} />
        <div className="relative"><Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" /><Select className="pl-10" aria-label="Date range"><option>Last 7 days</option><option>Today</option><option>This month</option></Select></div>
        <Select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Examination"><option>All</option>{exams.slice(0, 3).map((e) => <option key={e.id} value={e.name.split(' —')[0]}>{e.name.split(' —')[0]}</option>)}</Select>
      </div>
      {tab === 'summary' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <Card title="Eligible vs Not Eligible">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Donut label="95.1%" sub="eligible" parts={[{ name: 'e', v: kpis.eligible, color: '#138653' }, { name: 'n', v: kpis.notEligible, color: '#B33A3A' }]} />
              <dl className="w-full space-y-2 text-sm">
                <div className="flex justify-between"><dt>Eligible</dt><dd className="font-bold tabular-nums">{kpis.eligible.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt>Not eligible</dt><dd className="font-bold tabular-nums">{kpis.notEligible}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-2"><dt>Duplicates blocked</dt><dd className="font-bold tabular-nums">41</dd></div>
              </dl>
            </div>
          </Card>
          <Card title="Attendance rate by examination"><Bars data={byExam} /></Card>
        </div>
      ) : (
        <Card title="Scan audit history" subtitle="Every scan with time, operator and outcome" pad={false}
          action={<Tabs value={view} onChange={setView} tabs={[{ id: 'ready', label: 'Ready' }, { id: 'loading', label: 'Loading' }, { id: 'empty', label: 'Empty' }]} />}>
          <div className="mt-3">
            {view === 'loading' ? <Skeleton rows={6} /> : view === 'empty' || !rows.length ? <EmptyState title="No scans for this filter" text="Change the examination or date range." /> : (
              <DataTable rowKey={(r) => r.time} rows={rows} columns={[
                { key: 'time', label: 'Timestamp', className: 'tabular-nums', render: (r) => `2026-11-04 ${r.time}` },
                { key: 'id', label: 'Student ID', className: 'font-mono text-[13px]' },
                { key: 'name', label: 'Student' },
                { key: 'by', label: 'Scanned by' },
                { key: 'result', label: 'Result', render: (r) => <StatusBadge status={r.result} /> },
              ]} />
            )}
          </div>
        </Card>
      )}
    </>
  );
}
