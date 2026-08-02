import { CheckCircle2, XCircle, Clock } from 'lucide-react';

// The system's signature visual: an ink-stamp seal that "lands" on screen
// the moment a scan is verified, echoing the paper attendance-sheet stamps
// this system is designed to replace.
const CONFIG = {
  Eligible: {
    label: 'ELIGIBLE · RECORDED',
    ring: 'border-eligible text-eligible',
    bg: 'bg-eligible/5',
    Icon: CheckCircle2,
  },
  'Not Eligible': {
    label: 'NOT ELIGIBLE',
    ring: 'border-ineligible text-ineligible',
    bg: 'bg-ineligible/5',
    Icon: XCircle,
  },
  Pending: {
    label: 'PENDING SYNC',
    ring: 'border-pending text-pending',
    bg: 'bg-pending/5',
    Icon: Clock,
  },
};

const EligibilityStamp = ({ status = 'Eligible', size = 'md' }) => {
  const cfg = CONFIG[status] || CONFIG.Eligible;
  const dims = size === 'lg' ? 'w-40 h-40 text-sm' : 'w-24 h-24 text-[10px]';

  return (
    <div
      className={`stamp-animate select-none rounded-full border-[3px] ${cfg.ring} ${cfg.bg} ${dims} flex flex-col items-center justify-center gap-1 font-display tracking-widest uppercase -rotate-6 shadow-sm`}
      style={{ borderStyle: 'double', borderWidth: size === 'lg' ? 6 : 4 }}
    >
      <cfg.Icon size={size === 'lg' ? 32 : 20} strokeWidth={1.75} />
      <span className="text-center leading-tight px-2">{cfg.label}</span>
    </div>
  );
};

export default EligibilityStamp;
