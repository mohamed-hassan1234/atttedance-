import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, CalendarClock, Users, GraduationCap,
  FileBarChart2, LogOut, Landmark, School, UserCog, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConnectionBadge from '../components/ConnectionBadge';
import HormuudLogo from '../components/HormuudLogo';
import ToastViewport from '../components/ToastViewport';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItem = (to, label, Icon, end = false) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-2 h-7 w-1 rounded-r bg-brand" aria-hidden="true" />}
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
          {label}
        </>
      )}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0B1220] px-3 py-5">
      <div className="flex items-center justify-between px-2 pb-6">
        <div className="flex min-w-0 items-center gap-3">
          <HormuudLogo size={40} />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-white">SEAMS</p>
            <p className="truncate text-[11px] text-slate-400">Hormuud University</p>
          </div>
        </div>
      </div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {isAdmin ? 'Administration' : 'Invigilation'}
      </p>
      <nav className="flex flex-col gap-1" aria-label="Primary">
        {navItem('/', 'Dashboard', LayoutDashboard, true)}
        {navItem('/scan', isAdmin ? 'Scan Attendance' : 'Scan Student ID', ScanLine)}
        {navItem('/exams', 'Examinations', CalendarClock)}
        {isAdmin && navItem('/students', 'Students', GraduationCap)}
        {isAdmin && navItem('/faculties', 'Faculties', Landmark)}
        {isAdmin && navItem('/classes', 'Classes', School)}
        {isAdmin && navItem('/assignments', 'Assignments', UserCog)}
        {isAdmin && navItem('/users', 'Manage Users', Users)}
        {isAdmin && navItem('/reports', 'Reports', FileBarChart2)}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold uppercase text-white">
            {user?.fullName?.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="text-xs capitalize text-slate-400">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block">{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-ledger-950/60" />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10">
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setDrawer(true)} aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
              <Menu size={20} />
            </button>
            <HormuudLogo size={34} />
            <span className="text-[15px] font-bold tracking-tight text-brand-dark">SEAMS</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <ConnectionBadge />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold uppercase text-white lg:hidden">
              {user?.fullName?.charAt(0)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
};

export default AppLayout;
