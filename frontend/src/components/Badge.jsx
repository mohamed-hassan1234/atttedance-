const TONE_MAP = {
  eligible: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  ineligible: 'bg-red-50 text-red-800 ring-red-600/20',
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  seal: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  brand: 'bg-sky-50 text-sky-800 ring-sky-600/20',
};

const Badge = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE_MAP[tone]}`}>
    {children}
  </span>
);

export default Badge;
