import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// App-wide toast notifications for action feedback (save/delete/export
// succeeded or failed) across the Admin CRUD screens. Kept intentionally
// small: no queueing library, just a list of { id, kind, message } objects
// that auto-dismiss, rendered by <ToastViewport /> (mounted once in
// AppLayout so every authenticated page can call useToast()).
const ToastContext = createContext(null);
const AUTO_DISMISS_MS = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind, message) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    toasts,
    dismiss,
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }), [toasts, dismiss, push]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
