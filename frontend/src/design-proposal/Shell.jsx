import { useState } from 'react';
import { LayoutDashboard, ScanLine, ClipboardList, GraduationCap, Users, BarChart3, Menu, X, Bell, LogOut, UserCircle, Settings, ChevronDown, Search, Radio } from 'lucide-react';
import HormuudLogo from '../components/HormuudLogo';
import { cx, Dropdown, MenuItem, Badge, Progress } from './ui';
import { exams } from './data';

const ADMIN_NAV = [
  { id: 'admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scan attendance', icon: ScanLine },
  { id: 'exams', label: 'Examinations', icon: ClipboardList },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'users', label: 'Users & assignments', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];
const INV_NAV = [
  { id: 'invigilator', label: 'My dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scan attendance', icon: ScanLine },
  { id: 'exams', label: 'My examinations', icon: ClipboardList },
];

const Wordmark = ({ dark }) => (
  <div className="flex min-w-0 items-center gap-3">
    <HormuudLogo size={40} />
    <div className="min-w-0 leading-tight">
      <p className={cx('text-[15px] font-bold tracking-tight', dark ? 'text-white' : 'text-brand-dark')}>SEAMS</p>
      <p className={cx('truncate text-[11px]', dark ? 'text-slate-400' : 'text-brand-muted')}>Hormuud University</p>
    </div>
  </div>
);

const ProfileMenu = ({ role, dark }) => (
  <Dropdown
    trigger={
      <button className={cx('flex min-h-[44px] items-center gap-2.5 rounded-lg px-2 hover:bg-slate-100/80', dark && 'hover:bg-white/10')}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{role === 'admin' ? 'MW' : 'FA'}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className={cx('block text-sm font-semibold', dark ? 'text-white' : 'text-brand-dark')}>{role === 'admin' ? 'Mohamed Warsame' : 'Fadumo Ali'}</span>
          <span className={cx('block text-xs', dark ? 'text-slate-300' : 'text-brand-muted')}>{role === 'admin' ? 'Administrator' : 'Invigilator'}</span>
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
    }
  >
    <MenuItem icon={UserCircle}>Profile</MenuItem>
    <MenuItem icon={Settings}>Preferences</MenuItem>
    <div className="my-1 border-t border-slate-100" />
    <MenuItem icon={LogOut} danger>Sign out (preview only)</MenuItem>
  </Dropdown>
);

const TopSearch = () => (
  <label className="relative hidden w-72 lg:block">
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    <input placeholder="Search students, exams…" aria-label="Search" className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15" />
  </label>
);

const Bell_ = ({ dark }) => (
  <button aria-label="Notifications" className={cx('relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100/80', dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500')}>
    <Bell size={19} /><span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-blue ring-2 ring-white" />
  </button>
);

const NavList = ({ nav, screen, go, variant, onPick }) => (
  <nav className="space-y-1" aria-label="Primary">
    {nav.map(({ id, label, icon: Icon }) => {
      const active = screen === id;
      return (
        <button key={id} onClick={() => { go(id); onPick?.(); }} aria-current={active ? 'page' : undefined}
          className={cx(
            'relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            variant === 'dark'
              ? active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              : active ? 'bg-emerald-50 text-brand-deep' : 'text-slate-600 hover:bg-slate-50',
          )}>
          {variant === 'dark' && active && <span className="absolute -left-3 top-2 h-7 w-1 rounded-r bg-brand" />}
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className={active && variant !== 'dark' ? 'text-brand' : ''} />
          {label}
        </button>
      );
    })}
  </nav>
);

const PreviewBadge = ({ dark }) => (
  <div className={cx('rounded-lg px-3 py-2.5 text-xs', dark ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-brand-muted')}>
    <p className={cx('font-semibold', dark ? 'text-white' : 'text-brand-dark')}>Design preview</p>
    Demo data only. Nothing is saved or sent.
  </div>
);

export default function Shell({ concept, screen, go, role, children }) {
  const [drawer, setDrawer] = useState(false);
  const nav = role === 'admin' ? ADMIN_NAV : INV_NAV;
  const live = exams[0];

  // ---------- Concept C: top navigation + exam context strip ----------
  if (concept === 'C') {
    return (
      <div className="min-h-full bg-brand-bg font-body text-brand-dark">
        <header className="sticky top-0 z-30 bg-[#0B1220] text-white">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
            <button className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
            <Wordmark dark />
            <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
              {nav.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => go(id)} aria-current={screen === id ? 'page' : undefined}
                  className={cx('flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-medium', screen === id ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
                  <Icon size={16} />{label.replace(' & assignments', '')}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1"><Bell_ dark /><ProfileMenu role={role} dark /></div>
          </div>
          <div className="border-t border-white/10 bg-[#111C33]">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-xs sm:px-6">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300"><Radio size={14} className="animate-pulse" />LIVE</span>
              <span className="font-semibold text-white">{live.name}</span>
              <span className="text-slate-300">{live.room} · {live.time}</span>
              <span className="flex min-w-[160px] flex-1 items-center gap-3 sm:max-w-xs">
                <span className="w-full"><Progress value={(live.present / live.total) * 100} /></span>
                <span className="whitespace-nowrap tabular-nums text-slate-200">{live.present}/{live.total}</span>
              </span>
              <span className="ml-auto text-slate-400">{'Demo data'}</span>
            </div>
          </div>
        </header>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
            <div className="absolute inset-0 bg-[#0B1220]/60" />
            <div className="absolute inset-y-0 left-0 w-72 bg-[#0B1220] p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between"><Wordmark dark /><button onClick={() => setDrawer(false)} className="h-11 w-11 text-white" aria-label="Close menu"><X size={20} className="mx-auto" /></button></div>
              <NavList nav={nav} screen={screen} go={go} variant="dark" onPick={() => setDrawer(false)} />
            </div>
          </div>
        )}
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    );
  }

  // ---------- Concepts A & B: sidebar ----------
  const dark = concept === 'B';
  const sidebar = (onPick) => (
    <div className={cx('flex h-full flex-col px-3 py-5', dark ? 'bg-[#0B1220]' : 'bg-white')}>
      <div className="px-2 pb-6"><Wordmark dark={dark} /></div>
      <p className={cx('mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider', dark ? 'text-slate-500' : 'text-slate-400')}>{role === 'admin' ? 'Administration' : 'Invigilation'}</p>
      <NavList nav={nav} screen={screen} go={go} variant={dark ? 'dark' : 'light'} onPick={onPick} />
      <div className="mt-auto space-y-3 pt-6">
        <div className={cx('flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium', dark ? 'bg-white/5 text-slate-300' : 'bg-emerald-50 text-brand-deep')}>
          <span className="h-2 w-2 rounded-full bg-brand" /> Online · synced
        </div>
        <PreviewBadge dark={dark} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full bg-brand-bg font-body text-brand-dark">
      <aside className={cx('sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block', !dark && 'border-r border-slate-200')}>{sidebar()}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-[#0B1220]/60" />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-2xl" onClick={(e) => e.stopPropagation()}>{sidebar(() => setDrawer(false))}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="lg:hidden"><HormuudLogo size={34} /></div>
          <TopSearch />
          <div className="ml-auto flex items-center gap-1">
            <Badge tone="blue">Design preview</Badge>
            <Bell_ /><ProfileMenu role={role} />
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
