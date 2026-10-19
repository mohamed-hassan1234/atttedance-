import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import api from '../services/api';
import { addToQueue } from '../services/offlineQueue';
import { createScanCoordinator } from '../services/scanCoordinator';
import { parseStudentId } from '../utils/parseStudentId';
import QrScanner from './QrScanner';
import AttendanceResultCard, { AUTO_RESET_STATES } from './AttendanceResultCard';

// Legacy QR/barcode scanning flow. Superseded by OcrAttendanceScanner as the
// primary attendance method (see pages/ScanAttendance.jsx), but kept working
// and tested: it shares the same backend endpoint and the same audit trail
// (QrScanRecord), so any ID card still carrying an old QR code keeps working.
//
// Scanner states: idle | requesting-camera | scanning | processing | success |
// rejected | duplicate | offline-queued | camera-error
// `flow` tracks what the scan flow is doing ('ready' means the camera state
// applies); `cameraState` is reported by QrScanner. They are kept separate so
// neither can overwrite the other.
const AUTO_RESET_MS = 2500;
const REQUEST_TIMEOUT_MS = 15000;

const vibrate = (pattern) => {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
};

// Camera attendance flow for one exam: camera -> read Student ID -> POST /qr/scan -> result.
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

  const queueOffline = (studentId, forExamId) => {
    addToQueue({ studentId, examId: forExamId });
    finish('offline-queued', {
      title: 'Saved offline',
      message: `Student ID ${studentId} saved for synchronization. Eligibility is checked when it syncs.`,
    });
  };

  const submit = async (raw) => {
    setFlow('processing');
    const scannedExamId = live.current.examId;
    const parsed = parseStudentId(raw);
    if (!parsed.ok) {
      finish('rejected', { title: parsed.error, message: 'The code does not contain a Student ID. Scan the code on the student ID card, or enter the Student ID manually.' });
      return;
    }
    const { studentId } = parsed;

    if (!live.current.isOnline) {
      queueOffline(studentId, scannedExamId);
      return;
    }

    try {
      const { data } = await api.post(
        '/qr/scan',
        { studentId, examId: scannedExamId, deviceInfo: navigator.userAgent },
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
        queueOffline(studentId, scannedExamId); // network failure or timeout: never lose the scan
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
          title: res.status === 404 ? `Student ${studentId} not found` : 'Scan rejected',
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
      <div className="rounded-xl border border-dashed border-ledger-200 p-6 text-center text-sm text-ledger-500">
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
      {result && <AttendanceResultCard result={result} onNext={reset} />}
    </div>
  );
};

export default QrAttendanceScanner;
