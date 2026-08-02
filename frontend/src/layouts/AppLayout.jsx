import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, CalendarClock, Users, GraduationCap,
  FileBarChart2, LogOut, ShieldCheck, Landmark, School, UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConnectionBadge from '../components/ConnectionBadge';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItem = (to, label, Icon, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-ledger-800 text-white'
            : 'text-ledger-200 hover:bg-ledger-800/60 hover:text-white'
        }`
      }
    >
      <Icon size={17} strokeWidth={1.8} />
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-ledger-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-ledger-950 shrink-0 px-4 py-6">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center text-ledger-950">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-white text-[15px]">SEAMS</p>
            <p className="text-ledger-400 text-[11px]">Exam Attendance</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItem('/', 'Dashboard', LayoutDashboard, true)}
          {navItem('/scan', isAdmin ? 'Scan Attendance' : 'Scan Student QR', ScanLine)}
          {navItem('/exams', 'Examinations', CalendarClock)}
          {isAdmin && navItem('/students', 'Students', GraduationCap)}
          {isAdmin && navItem('/faculties', 'Faculties', Landmark)}
          {isAdmin && navItem('/classes', 'Classes', School)}
          {isAdmin && navItem('/assignments', 'Assignments', UserCog)}
          {isAdmin && navItem('/users', 'Manage Users', Users)}
          {isAdmin && navItem('/reports', 'Reports', FileBarChart2)}
        </nav>

        <div className="mt-auto pt-6 border-t border-ledger-800/80">
          <div className="px-2 mb-3">
            <p className="text-white text-sm font-medium">{user?.fullName}</p>
            <p className="text-ledger-400 text-xs capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-ledger-200 hover:bg-ledger-800/60 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-ledger-100 bg-white/80 backdrop-blur px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="md:hidden font-display text-lg text-ledger-900">SEAMS</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <ConnectionBadge />
            <div className="w-8 h-8 rounded-full bg-ledger-800 text-white flex items-center justify-center text-xs font-semibold uppercase">
              {user?.fullName?.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 bg-ledger-950 border-t border-ledger-800 flex items-center justify-around py-2">
          <NavLink to="/" end className={({isActive}) => `p-2.5 rounded-xl ${isActive ? 'text-seal-light' : 'text-ledger-300'}`}><LayoutDashboard size={20}/></NavLink>
          <NavLink to="/scan" className={({isActive}) => `p-2.5 rounded-xl ${isActive ? 'text-seal-light' : 'text-ledger-300'}`}><ScanLine size={20}/></NavLink>
          <NavLink to="/exams" className={({isActive}) => `p-2.5 rounded-xl ${isActive ? 'text-seal-light' : 'text-ledger-300'}`}><CalendarClock size={20}/></NavLink>
          {isAdmin && <NavLink to="/reports" className={({isActive}) => `p-2.5 rounded-xl ${isActive ? 'text-seal-light' : 'text-ledger-300'}`}><FileBarChart2 size={20}/></NavLink>}
          <button onClick={handleLogout} className="p-2.5 rounded-xl text-ledger-300"><LogOut size={20}/></button>
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
