import { CheckCircle2, Copy, ScanLine, ShieldX, WifiOff, XCircle } from 'lucide-react';

// Shared result presentation for any attendance scan flow (OCR or legacy QR):
// a colored status card with the student summary, used so a scan's outcome
// never relies on color alone — an icon and text label are always present too.
const AUTO_RESET_STATES = ['success', 'offline-queued'];

const STYLES = {
  success: { box: 'border-eligible/40 bg-eligible/10 text-eligible', Icon: CheckCircle2 },
  rejected: { box: 'border-ineligible/40 bg-ineligible/10 text-ineligible', Icon: XCircle },
  duplicate: { box: 'border-pending/40 bg-pending/10 text-pending', Icon: Copy },
  'offline-queued': { box: 'border-pending/40 bg-pending/10 text-pending', Icon: WifiOff },
  denied: { box: 'border-ineligible/40 bg-ineligible/10 text-ineligible', Icon: ShieldX },
};

const formatTime = (value) => new Date(value || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const AttendanceResultCard = ({ result, onNext }) => {
  const { box, Icon } = STYLES[result.style || result.kind] || STYLES.rejected;
  const { student } = result;
  return (
    <div className={`rounded-xl border p-4 ${box}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon size={28} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight">{result.title}</p>
          {result.message && <p className="mt-1 text-sm text-ledger-700">{result.message}</p>}
        </div>
      </div>

      {student && (
        <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 rounded-xl bg-white/80 p-3 text-sm text-ledger-900">
          <dt className="text-ledger-400">Student</dt><dd className="font-medium">{student.fullName}</dd>
          <dt className="text-ledger-400">ID</dt><dd className="font-mono">{student.studentId}</dd>
          <dt className="text-ledger-400">Faculty</dt><dd>{student.faculty}</dd>
          <dt className="text-ledger-400">Department</dt><dd>{student.department}</dd>
          {student.className && (<><dt className="text-ledger-400">Class</dt><dd>{student.className}</dd></>)}
          {result.exam && (<><dt className="text-ledger-400">Exam</dt><dd>{result.exam.examName} ({result.exam.courseCode})</dd></>)}
          <dt className="text-ledger-400">Time</dt><dd>{formatTime(result.time)}</dd>
        </dl>
      )}

      {!AUTO_RESET_STATES.includes(result.kind) && (
        <button
          type="button"
          onClick={onNext}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-deep text-sm font-medium text-white hover:bg-brand-deep/90"
        >
          <ScanLine size={18} /> Scan next student
        </button>
      )}
    </div>
  );
};

export default AttendanceResultCard;
export { AUTO_RESET_STATES };
