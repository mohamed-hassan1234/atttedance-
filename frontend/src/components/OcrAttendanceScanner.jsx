import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, RotateCcw, WifiOff } from 'lucide-react';
import api from '../services/api';
import { addToQueue } from '../services/offlineQueue';
import { createScanCoordinator } from '../services/scanCoordinator';
import { isValidStudentId } from '../utils/studentIdParser';
import OcrCameraView from './OcrCameraView';
import AttendanceResultCard, { AUTO_RESET_STATES } from './AttendanceResultCard';

// Primary attendance flow for one exam:
//   camera -> OCR recognition -> Student ID validation -> POST /qr/scan -> result.
// /api/qr/scan already accepts a plain `studentId` (see backend/src/controllers
// /qrController.js) and does the real work: it loads the Student and
// Examination from the database, checks the invigilator is assigned to this
// exam, and runs the one shared eligibility function used by every entry path
// (manual, legacy QR, offline sync). The Student ID OCR reads off the card is
// only ever used as a lookup key here — eligibility, duplicate detection and
// authorization are all decided server-side, never in this component.
//
// flow: ready | confirm | processing | success | rejected | duplicate | offline-queued
// `flow` tracks what this component is doing; `cameraState` is reported by
// OcrCameraView. They're kept separate so neither can overwrite the other —
// same pattern as the legacy QrAttendanceScanner.
const AUTO_RESET_MS = 2500;
const REQUEST_TIMEOUT_MS = 15000;
const RESUBMIT_COOLDOWN_MS = 4000;

const vibrate = (pattern) => {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
};

const OcrAttendanceScanner = ({ exam, isOnline, onOutcome }) => {
  const examId = exam?._id;
  const [flow, setFlow] = useState('ready');
  const [cameraState, setCameraState] = useState('requesting-camera');
  const [hint, setHint] = useState(''); // live "what the camera currently sees" status, non-blocking
  const [confirmState, setConfirmState] = useState(null); // { studentId, candidates, reason, confidence, previewDataUrl }
  const [editedId, setEditedId] = useState('');
  const scanState = !examId ? 'idle' : flow !== 'ready' && flow !== 'confirm' ? flow : cameraState;
  const [result, setResult] = useState(null);
  const resetTimer = useRef(null);
  const lastReadRef = useRef(null); // last clean ID seen by auto-capture, for the two-reads-in-a-row rule
  const live = useRef({});
  live.current = { examId, isOnline, onOutcome };

  const clearTimer = () => { clearTimeout(resetTimer.current); resetTimer.current = null; };

  const finish = useCallback((kind, details) => {
    setResult({ kind, time: Date.now(), ...details });
    setFlow(kind);
    setConfirmState(null);
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

  // The one place that talks to the server. By the time this runs, studentId
  // has already passed isValidStudentId — OCR text itself is never sent.
  const submit = async (studentId) => {
    setFlow('processing');
    const scannedExamId = live.current.examId;

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
          message: body.message || 'A syntactically valid Student ID was recognized, but the attempt could not be completed. Please try again.',
          student: body.student,
        });
      }
    }
  };

  // Debounces auto-accepted recognitions the same way the legacy QR flow
  // debounces repeat detections: one submission per Student ID per cooldown
  // window, so a card still sitting in the frame across several auto-capture
  // ticks is never submitted twice.
  const coordinator = useMemo(
    () => createScanCoordinator({ submit: (id) => submit(id), cooldownMs: RESUBMIT_COOLDOWN_MS }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function reset() {
    clearTimer();
    coordinator.release();
    setResult(null);
    setConfirmState(null);
    setHint('');
    setFlow('ready');
  }
  live.current.reset = reset;

  // A different exam means a different attendance list: drop any stale result.
  useEffect(() => {
    clearTimer();
    coordinator.release();
    setResult(null);
    setConfirmState(null);
    setFlow('ready');
  }, [examId, coordinator]);

  useEffect(() => clearTimer, []);

  const handleStatus = useCallback((status) => setCameraState(status.state), []);

  // Called on every completed OCR attempt (several per minute from the
  // background auto-capture, plus manual "Recognize now" taps). Only a clean,
  // high-confidence single match is submitted automatically; anything else
  // pauses the camera and asks the invigilator to confirm, exactly as the
  // spec requires — a recognized ID is never silently submitted when
  // confidence is insufficient or more than one candidate was found.
  const handleOcrResult = useCallback((ocrResult) => {
    if (flow !== 'ready') return; // a previous result/confirmation is still showing
    if (ocrResult.ok && ocrResult.source !== 'photo' && isValidStudentId(ocrResult.studentId)) {
      // A single clean read is not enough: the same ID must be read on two
      // consecutive attempts, so a one-off misread of background text can
      // never be submitted on its own.
      if (lastReadRef.current !== ocrResult.studentId) {
        lastReadRef.current = ocrResult.studentId;
        setHint(`Reading ${ocrResult.studentId} — hold steady…`);
        return;
      }
      lastReadRef.current = null;
      setHint('');
      coordinator.handleDetection(ocrResult.studentId);
      return;
    }
    lastReadRef.current = null;
    // Photo uploads are one-shot, so they are always confirmed by a person.
    if (ocrResult.studentId) {
      setConfirmState({
        studentId: ocrResult.studentId,
        candidates: ocrResult.candidates || [],
        reason: ocrResult.reason,
        confidence: ocrResult.confidence,
        previewDataUrl: ocrResult.previewDataUrl,
      });
      setEditedId(ocrResult.studentId);
      setFlow('confirm');
      return;
    }
    // Nothing found this attempt — just update the live status line, keep trying.
    setHint(ocrResult.reason || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, coordinator]);

  const confirmAndSubmit = () => {
    const id = editedId.trim().toUpperCase();
    if (!isValidStudentId(id)) return;
    setFlow('processing');
    submit(id);
  };

  const rescan = () => {
    setConfirmState(null);
    setHint('');
    setFlow('ready');
  };

  if (!examId) {
    return (
      <div className="rounded-xl border border-dashed border-ledger-200 p-6 text-center text-sm text-ledger-500">
        Select an examination first. Scans are always recorded against the exam you have open.
      </div>
    );
  }

  const busy = flow !== 'ready' && flow !== 'confirm';
  const cameraPaused = flow !== 'ready';

  return (
    <div className="space-y-3">
      {!isOnline && (
        <p className="flex items-center gap-2 rounded-xl border border-pending/30 bg-pending/10 px-3 py-2 text-xs text-pending">
          <WifiOff size={14} /> Offline — scans are saved on this device and synced when you reconnect.
        </p>
      )}

      <OcrCameraView
        paused={cameraPaused}
        onStatus={handleStatus}
        onResult={handleOcrResult}
      />

      <p className="sr-only" role="status" aria-live="polite">{scanState === 'processing' ? 'Checking student…' : ''}</p>
      {scanState === 'recognizing' && !hint && (
        <p className="text-center text-xs text-ledger-400">Reading the card…</p>
      )}
      {scanState === 'scanning' && hint && flow === 'ready' && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ledger-400">
          <AlertTriangle size={12} /> {hint}
        </p>
      )}

      {flow === 'confirm' && confirmState && (
        <div className="space-y-3 rounded-xl border border-pending/30 bg-pending/10 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-pending">
            <AlertTriangle size={16} /> Confirm the Student ID
          </p>
          <p className="text-xs text-ledger-600">{confirmState.reason}</p>

          {confirmState.candidates.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {confirmState.candidates.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setEditedId(candidate)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-mono ${editedId === candidate ? 'border-brand bg-brand/10 text-brand-deep' : 'border-ledger-200 text-ledger-600'}`}
                >
                  {candidate}
                </button>
              ))}
            </div>
          )}

          <input
            value={editedId}
            onChange={(e) => setEditedId(e.target.value.toUpperCase())}
            placeholder="e.g. HU00004698"
            className="w-full rounded-xl border border-ledger-200 bg-white px-3.5 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          {editedId && !isValidStudentId(editedId.trim()) && (
            <p className="text-xs text-ineligible">Not a valid Student ID format (e.g. HU00004698).</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rescan}
              className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl border border-ledger-200 text-sm font-medium text-ledger-600 hover:bg-white"
            >
              <RotateCcw size={16} /> Rescan
            </button>
            <button
              type="button"
              onClick={confirmAndSubmit}
              disabled={!isValidStudentId(editedId.trim())}
              className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-deep text-sm font-medium text-white hover:bg-brand-deep/90 disabled:opacity-50"
            >
              <Check size={16} /> Confirm &amp; submit
            </button>
          </div>
        </div>
      )}

      {scanState === 'processing' && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-ledger-50 py-3 text-sm text-ledger-600" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" /> Checking student…
        </div>
      )}
      {result && <AttendanceResultCard result={result} onNext={reset} />}
    </div>
  );
};

export default OcrAttendanceScanner;
