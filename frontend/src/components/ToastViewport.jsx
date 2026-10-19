import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const STYLES = {
  success: { box: 'border-eligible/30 bg-white text-ledger-900', Icon: CheckCircle2, iconClass: 'text-eligible' },
  error: { box: 'border-ineligible/30 bg-white text-ledger-900', Icon: XCircle, iconClass: 'text-ineligible' },
  info: { box: 'border-brand/30 bg-white text-ledger-900', Icon: Info, iconClass: 'text-brand-deep' },
};

// Fixed bottom-right (bottom-center on mobile, above the bottom nav) stack of
// toasts. Mounted once in AppLayout; any page calls useToast().success(...)
// etc. Each toast announces itself via role="status" so screen readers hear
// it without stealing focus.
const ToastViewport = () => {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
      {toasts.map((t) => {
        const { box, Icon, iconClass } = STYLES[t.kind] || STYLES.info;
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-card fade-up ${box}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass}`} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-ledger-400 hover:text-ledger-900"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastViewport;
