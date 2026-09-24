import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, ScanLine, ShieldX, WifiOff, XCircle } from 'lucide-react';
import api from '../services/api';
import { addToQueue } from '../services/offlineQueue';
import { createScanCoordinator } from '../services/scanCoordinator';
import { parseStudentQr } from '../utils/parseStudentQr';
import QrScanner from './QrScanner';

// Scanner states: idle | requesting-camera | scanning | processing | success |
// rejected | duplicate | offline-queued | camera-error
// `flow` tracks what the scan flow is doing ('ready' means the camera state
// applies); `cameraState` is reported by QrScanner. They are kept separate so
// neither can overwrite the other.
const AUTO_RESET_MS = 2500;
const AUTO_RESET_STATES = ['success', 'offline-queued'];
const REQUEST_TIMEOUT_MS = 15000;

const vibrate = (pattern) => {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
};

const formatTime = (value) => new Date(value || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const STYLES = {
  success: { box: 'border-eligible/40 bg-eligible/10 text-eligible', Icon: CheckCircle2 },
  rejected: { box: 'border-ineligible/40 bg-ineligible/10 text-ineligible', Icon: XCircle },
  duplicate: { box: 'border-pending/40 bg-pending/10 text-pending', Icon: Copy },
  'offline-queued': { box: 'border-pending/40 bg-pending/10 text-pending', Icon: WifiOff },
  denied: { box: 'border-ineligible/40 bg-ineligible/10 text-ineligible', Icon: ShieldX },
};

const ResultCard = ({ result, onNext }) => {
  const { box, Icon } = STYLES[result.style || result.kind] || STYLES.rejected;
  const { student } = result;
  return (
    <div className={`rounded-2xl border p-4 ${box}`} role="status" aria-live="polite">
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
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ledger-900 text-sm font-medium text-white hover:bg-ledger-800"
        >
          <ScanLine size={18} /> Scan next student
        </button>
      )}
    </div>
  );
};

// QR attendance flow for one exam: camera -> parse -> POST /qr/scan -> result.
// Eligibility, authorization and duplicate checks all happen on the server.
const QrAttendanceScanner = ({ exam, isOnline, onOutcome }) => {
  const examId = exam?._id;
  const [flow, setFlow] = useState('ready');
  const [cameraState, setCameraState] = useState('requesting-camera');
  const scanState = !examId ? 'idle' : flow !== 'ready' ? flow : cameraState;
  const [result, setResult] = useState(null);
  const resetTimer = useRef(null);
  const live = useRef({});
  live.current = { examId, isOnline, onOutcome };

  const clearTimer = () => { clearTimeout(resetTimer.current); resetTimer.current = null; };

  const finish = useCallback((kind, details) => {
    setResult({ kind, time: Date.now(), ...details });
    setFlow(kind);
    vibrate(kind === 'success' ? 80 : kind === 'offline-queued' ? [40, 40, 40] : [120, 60, 120]);
    live.current.onOutcome?.({ kind, student: details.student, queued: kind === 'offline-queued' });
    if (AUTO_RESET_STATES.includes(kind)) {
      clearTimer();
      resetTimer.current = setTimeout(() => live.current.reset(), AUTO_RESET_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueOffline = (token, forExamId) => {
    addToQueue({ qrToken: token, examId: forExamId });
    finish('offline-queued', {
      title: 'Saved offline',
      message: 'Offline — scan saved for synchronization. Eligibility is checked when it syncs.',
    });
  };

  const submit = async (raw) => {
    setFlow('processing');
    const scannedExamId = live.current.examId;
    const parsed = parseStudentQr(raw);
    if (!parsed.ok) {
      finish('rejected', { title: parsed.error, message: 'This is not a SEAMS student QR code. Try again or enter the Student ID manually.' });
      return;
    }

    if (!live.current.isOnline) {
      queueOffline(parsed.token, scannedExamId);
      return;
    }

    try {
      const { data } = await api.post(
        '/qr/scan',
        { qrData: raw, examId: scannedExamId, deviceInfo: navigator.userAgent },
        { timeout: REQUEST_TIMEOUT_MS }
      );
      if (data.attendanceStatus === 'Eligible') {
        finish('success', { title: 'Attendance recorded', student: data.student, exam: data.exam, time: data.attendance?.timeStamp });
      } else {
        finish('rejected', {
          title: 'Not eligible',
          message: data.attendance?.eligibilityReason || 'Student is not eligible for this exam.',
          student: data.student,
          exam: data.exam,
          time: data.attendance?.timeStamp,
        });
      }
    } catch (err) {
      const res = err.response;
      if (!res) {
        queueOffline(parsed.token, scannedExamId); // network failure or timeout: never lose the scan
        return;
      }
      const body = res.data || {};
      if (res.status === 409) {
        finish('duplicate', {
          title: 'Attendance already recorded',
          message: 'Attendance has already been recorded for this student.',
          student: body.student,
          exam: body.exam,
          time: body.attendance?.timeStamp,
        });
      } else if (res.status === 403) {
        finish('rejected', { style: 'denied', title: 'Not allowed for this exam', message: body.message || 'You are not assigned to this examination.' });
      } else if (res.status === 401) {
        finish('rejected', { title: 'Session expired', message: 'Please sign in again.' });
      } else {
        finish('rejected', {
          title: res.status === 404 ? 'Student not found' : res.status === 410 ? 'QR code deactivated' : 'Scan rejected',
          message: body.message || 'Could not record attendance. Please try again.',
          student: body.student,
        });
      }
    }
  };

  const coordinator = useMemo(() => createScanCoordinator({ submit: (raw) => submit(raw) }), []); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    clearTimer();
    coordinator.release();
    setResult(null);
    setFlow('ready');
  }
  live.current.reset = reset;

  // A different exam means a different attendance list: drop any stale result.
  useEffect(() => {
    clearTimer();
    coordinator.release();
    setResult(null);
    setFlow('ready');
  }, [examId, coordinator]);

  useEffect(() => clearTimer, []);

  const handleStatus = useCallback((status) => setCameraState(status.state), []);

  if (!examId) {
    return (
      <div className="rounded-2xl border border-dashed border-ledger-200 p-6 text-center text-sm text-ledger-500">
        Select an examination first. Scans are always recorded against the exam you have open.
      </div>
    );
  }

  const busy = flow !== 'ready';

  return (
    <div className="space-y-3">
      {!isOnline && (
        <p className="flex items-center gap-2 rounded-xl border border-pending/30 bg-pending/10 px-3 py-2 text-xs text-pending">
          <WifiOff size={14} /> Offline — scans are saved on this device and synced when you reconnect.
        </p>
      )}

      <QrScanner
        paused={busy}
        onStatus={handleStatus}
        onDecode={(raw) => { coordinator.handleDetection(raw); }}
      />

      <p className="sr-only" role="status" aria-live="polite">{scanState === 'processing' ? 'Checking student…' : ''}</p>
      {scanState === 'processing' && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-ledger-50 py-3 text-sm text-ledger-600" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" /> Checking student…
        </div>
      )}
      {result && <ResultCard result={result} onNext={reset} />}
    </div>
  );
};

export default QrAttendanceScanner;
