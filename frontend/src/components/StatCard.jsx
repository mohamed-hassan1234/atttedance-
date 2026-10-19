const TONES = {
  default: { value: 'text-brand-dark', tile: 'bg-slate-100 text-slate-600' },
  brand: { value: 'text-brand-dark', tile: 'bg-emerald-50 text-brand' },
  blue: { value: 'text-brand-dark', tile: 'bg-sky-50 text-brand-blue' },
  eligible: { value: 'text-brand-deep', tile: 'bg-emerald-50 text-brand' },
  ineligible: { value: 'text-ineligible', tile: 'bg-red-50 text-red-700' },
  pending: { value: 'text-brand-dark', tile: 'bg-amber-50 text-amber-700' },
};

const StatCard = ({ label, value, icon: Icon, tone = 'default', hint, loading = false }) => {
  const t = TONES[tone] || TONES.default;
  return (
    <div className="fade-up flex items-start gap-3 rounded-xl border border-ledger-100 bg-white p-5 shadow-card">
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-brand-muted">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-slate-100" aria-hidden="true" />
        ) : (
          <p className={`mt-0.5 text-2xl font-bold tabular-nums tracking-tight ${t.value}`}>{value}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-brand-muted">{hint}</p>}
      </div>
    </div>
  );
};

export default StatCard;
