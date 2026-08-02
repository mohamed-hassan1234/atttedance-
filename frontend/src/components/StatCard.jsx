const StatCard = ({ label, value, icon: Icon, tone = 'default', hint }) => {
  const toneClasses = {
    default: 'text-ledger-900',
    eligible: 'text-eligible',
    ineligible: 'text-ineligible',
    pending: 'text-pending',
  };

  return (
    <div className="bg-white rounded-2xl border border-ledger-100 shadow-card p-5 flex flex-col gap-3 fade-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ledger-400">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-ledger-50 flex items-center justify-center text-ledger-600">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className={`font-display text-3xl ${toneClasses[tone]}`}>{value}</div>
      {hint && <span className="text-xs text-ledger-400">{hint}</span>}
    </div>
  );
};

export default StatCard;
