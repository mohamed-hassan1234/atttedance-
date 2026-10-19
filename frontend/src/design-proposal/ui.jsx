import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Search, Inbox, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// ---------- context ----------
export const PreviewContext = createContext({ concept: 'A', toast: () => {} });
export const usePreview = () => useContext(PreviewContext);

export const cx = (...a) => a.filter(Boolean).join(' ');

// ---------- Button ----------
const BTN = {
  primary: 'bg-brand text-white hover:bg-brand-deep shadow-sm focus-visible:ring-brand/40',
  secondary: 'bg-white text-brand-dark border border-slate-200 hover:bg-slate-50 focus-visible:ring-brand-blue/40',
  ghost: 'text-brand-dark hover:bg-slate-100 focus-visible:ring-brand-blue/40',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 focus-visible:ring-red-300',
  blue: 'bg-brand-blue text-white hover:bg-[#1f7aaa] shadow-sm focus-visible:ring-brand-blue/40',
};
export const Button = ({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, ...p }) => (
  <button
    {...p}
    disabled={p.disabled || loading}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'min-h-[36px] px-3 text-[13px]' : size === 'lg' ? 'min-h-[52px] px-6 text-base' : 'min-h-[44px] px-4 text-sm',
      BTN[variant], className,
    )}
  >
    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : Icon && <Icon size={16} strokeWidth={2} />}
    {children}
  </button>
);

// ---------- Inputs ----------
export const Field = ({ label, hint, error, children }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-[13px] font-semibold text-brand-dark">{label}</span>}
    {children}
    {error ? <span className="mt-1.5 block text-xs font-medium text-red-700">{error}</span> : hint && <span className="mt-1.5 block text-xs text-brand-muted">{hint}</span>}
  </label>
);
const inputCls = 'min-h-[44px] w-full rounded-lg border bg-white px-3.5 text-sm text-brand-dark placeholder:text-slate-400 transition focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-400';
export const Input = ({ icon: Icon, invalid, right, className, ...p }) => (
  <div className="relative">
    {Icon && <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
    <input {...p} className={cx(inputCls, Icon && 'pl-10', right && 'pr-11', invalid ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-brand focus:ring-brand/15', className)} />
    {right && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{right}</div>}
  </div>
);
export const Select = ({ children, className, ...p }) => (
  <div className="relative">
    <select {...p} className={cx(inputCls, 'appearance-none border-slate-200 pr-9 focus:border-brand focus:ring-brand/15', className)}>{children}</select>
    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
  </div>
);
export const SearchBox = ({ value, onChange, placeholder = 'Search…', className }) => (
  <div className={cx('min-w-0', className)}>
    <Input icon={Search} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </div>
);

// ---------- Badge ----------
const TONES = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  red: 'bg-red-50 text-red-800 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  blue: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  navy: 'bg-[#0B1220] text-white ring-transparent',
};
export const Badge = ({ tone = 'slate', dot, children }) => (
  <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', TONES[tone])}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);
const STATUS_TONE = {
  Eligible: 'green', 'Not Eligible': 'red', Duplicate: 'amber', 'Queued offline': 'blue',
  Live: 'green', Scheduled: 'blue', Completed: 'slate',
  Active: 'green', Inactive: 'slate', Cleared: 'green', 'Balance due': 'amber',
  Admin: 'navy', Invigilator: 'blue',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'slate'} dot={!['Admin', 'Invigilator'].includes(status)}>{status}</Badge>;

// ---------- Card ----------
export const Card = ({ title, subtitle, action, children, className, pad = true }) => (
  <section className={cx('min-w-0 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)]', className)}>
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-brand-dark">{title}</h3>
          {subtitle && <p className="text-xs text-brand-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </section>
);

export const PageHeader = ({ title, subtitle, actions, eyebrow }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-[28px]">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-brand-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Stat = ({ label, value, hint, icon: Icon, tone = 'brand', compact }) => {
  const c = { brand: 'bg-emerald-50 text-brand', blue: 'bg-sky-50 text-brand-blue', red: 'bg-red-50 text-red-700', slate: 'bg-slate-100 text-slate-600' }[tone];
  return (
    <div className={cx('flex items-start gap-3', compact ? '' : 'rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]')}>
      {Icon && <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c)}><Icon size={20} /></span>}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-brand-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-brand-dark">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-brand-muted">{hint}</p>}
      </div>
    </div>
  );
};

export const Progress = ({ value, tone = 'brand' }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <div className={cx('h-full rounded-full', tone === 'blue' ? 'bg-brand-blue' : 'bg-brand')} style={{ width: `${value}%` }} />
  </div>
);

// ---------- Tabs ----------
export const Tabs = ({ tabs, value, onChange }) => (
  <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1">
    {tabs.map((t) => (
      <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
        className={cx('min-h-[36px] whitespace-nowrap rounded-md px-3.5 text-sm font-semibold transition', value === t.id ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-muted hover:text-brand-dark')}>
        {t.label}
      </button>
    ))}
  </div>
);

// ---------- Dropdown menu ----------
export const Dropdown = ({ trigger, children, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{trigger}</div>
      {open && (
        <div role="menu" onClick={() => setOpen(false)} className={cx('absolute z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl', align === 'right' ? 'right-0' : 'left-0')}>
          {children}
        </div>
      )}
    </div>
  );
};
export const MenuItem = ({ icon: Icon, children, danger, onClick }) => (
  <button role="menuitem" onClick={onClick} className={cx('flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium hover:bg-slate-50', danger ? 'text-red-700' : 'text-brand-dark')}>
    {Icon && <Icon size={16} className="text-slate-400" />}{children}
  </button>
);

// ---------- Modal ----------
export const Modal = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1220]/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-brand-dark">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};

// ---------- Toast ----------
export const ToastViewport = ({ toasts }) => (
  <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
    {toasts.map((t) => {
      const Icon = t.tone === 'error' ? AlertTriangle : t.tone === 'info' ? Info : CheckCircle2;
      return (
        <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl">
          <Icon size={18} className={t.tone === 'error' ? 'text-red-600' : t.tone === 'info' ? 'text-brand-blue' : 'text-brand'} />
          <p className="text-sm font-medium text-brand-dark">{t.message}</p>
        </div>
      );
    })}
  </div>
);

// ---------- Skeleton / Empty ----------
export const Skeleton = ({ rows = 5 }) => (
  <div className="animate-pulse space-y-3 p-5" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="h-4 w-24 rounded bg-slate-100" /><div className="h-4 flex-1 rounded bg-slate-100" /><div className="h-4 w-20 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);
export const EmptyState = ({ title, text, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Inbox size={26} /></span>
    <h4 className="text-base font-semibold text-brand-dark">{title}</h4>
    <p className="mt-1 max-w-sm text-sm text-brand-muted">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ---------- Responsive table: table at md+, stacked cards below ----------
export const DataTable = ({ columns, rows, dense, rowKey }) => (
  <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {columns.map((c) => <th key={c.key} className={cx('px-5 text-[11px] font-semibold uppercase tracking-wider text-brand-muted', dense ? 'py-2' : 'py-3', c.className)}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r) : i} className="hover:bg-slate-50/60">
              {columns.map((c) => <td key={c.key} className={cx('px-5 text-sm text-brand-dark', dense ? 'py-2' : 'py-3.5', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ul className="divide-y divide-slate-100 md:hidden">
      {rows.map((r, i) => (
        <li key={rowKey ? rowKey(r) : i} className="space-y-1.5 px-4 py-3.5">
          {columns.map((c, ci) => (
            <div key={c.key} className={cx('flex items-start justify-between gap-3 text-sm', ci === 0 && 'font-semibold')}>
              {ci > 0 && <span className="shrink-0 text-xs text-brand-muted">{c.label}</span>}
              <span className={cx('min-w-0 text-right', ci === 0 && 'text-left')}>{c.render ? c.render(r) : r[c.key]}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  </>
);

export const Pagination = ({ page, pages, onPage, total }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-brand-muted">
    <span>Showing page {page} of {pages} · {total} records (demo)</span>
    <div className="flex gap-1.5">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  </div>
);
