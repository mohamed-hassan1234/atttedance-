import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Shell from './Shell';
import { PreviewContext, ToastViewport } from './ui';
import LoginScreen from './screens/LoginScreen';
import { AdminDashboard, InvigilatorDashboard } from './screens/Dashboards';
import ScannerScreen from './screens/ScannerScreen';
import { StudentsScreen, ExamsScreen, UsersScreen } from './screens/Management';
import ReportsScreen from './screens/ReportsScreen';
import { SCREENS } from './theme';

const VALID_SCREENS = SCREENS.map((s) => s.id);

// Rendered inside an <iframe> by the hub so Tailwind breakpoints react to the
// real device width. Also usable stand-alone at /design-proposal/preview.
export default function PreviewFrame() {
  const [params] = useSearchParams();
  const [concept, setConcept] = useState(['A', 'B', 'C'].includes(params.get('concept')) ? params.get('concept') : 'A');
  const [screen, setScreen] = useState(VALID_SCREENS.includes(params.get('screen')) ? params.get('screen') : 'admin');
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const go = useCallback((s) => {
    setScreen(s);
    window.parent !== window && window.parent.postMessage({ type: 'seams-proposal-nav', screen: s }, window.location.origin);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'seams-proposal-set') return;
      if (['A', 'B', 'C'].includes(e.data.concept)) setConcept(e.data.concept);
      if (VALID_SCREENS.includes(e.data.screen)) setScreen(e.data.screen);
    };
    window.addEventListener('message', h);
    window.parent !== window && window.parent.postMessage({ type: 'seams-proposal-ready' }, window.location.origin);
    return () => window.removeEventListener('message', h);
  }, []);

  const ctx = { concept, toast };
  let body;
  if (screen === 'login') body = <LoginScreen concept={concept} />;
  else {
    const role = screen === 'invigilator' || screen === 'scanner' ? 'invigilator' : 'admin';
    const content = {
      admin: <AdminDashboard concept={concept} />,
      invigilator: <InvigilatorDashboard concept={concept} go={go} />,
      scanner: <ScannerScreen concept={concept} />,
      students: <StudentsScreen />,
      exams: <ExamsScreen />,
      users: <UsersScreen />,
      reports: <ReportsScreen />,
    }[screen];
    body = <Shell concept={concept} screen={screen} go={go} role={role}>{content}</Shell>;
  }

  return (
    <PreviewContext.Provider value={ctx}>
      <div className="min-h-screen font-body">{body}</div>
      <ToastViewport toasts={toasts} />
    </PreviewContext.Provider>
  );
}
