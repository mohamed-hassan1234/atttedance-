const TONE_MAP = {
  eligible: 'bg-eligible/10 text-eligible border-eligible/30',
  ineligible: 'bg-ineligible/10 text-ineligible border-ineligible/30',
  pending: 'bg-pending/10 text-pending border-pending/30',
  neutral: 'bg-ledger-100 text-ledger-600 border-ledger-200',
  seal: 'bg-seal/10 text-seal-dark border-seal/30',
};

const Badge = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${TONE_MAP[tone]}`}>
    {children}
  </span>
);

export default Badge;
