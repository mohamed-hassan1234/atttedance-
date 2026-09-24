import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScanLine, Search, WifiOff, RefreshCcw, Users2, Camera, Keyboard, ArrowRight, History, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EligibilityStamp from '../components/EligibilityStamp';
import Badge from '../components/Badge';
import QrAttendanceScanner from '../components/QrAttendanceScanner';
import { addToQueue, getQueue, syncQueue } from '../services/offlineQueue';

const ScanAttendance = () => {
  const { isOnline, user } = useAuth();
  const isInvigilator = user?.role === 'invigilator';
  const [searchParams, setSearchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(searchParams.get('examId') || '');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [result, setResult] = useState(null); // { student, eligibilityStatus, message }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [queueCount, setQueueCount] = useState(getQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [roster, setRoster] = useState([]);
  const [attendedIds, setAttendedIds] = useState(new Set());
  const [rosterLoading, setRosterLoading] = useState(false);
  const [mode, setMode] = useState('qr'); // 'qr' | 'manual'
  const [scanPreview, setScanPreview] = useState(null); // { studentId, student, scanStatus, message }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    api.get(isInvigilator ? '/exams?mine=true' : '/exams').then(({ data }) => setExams(data.data));
  }, [isInvigilator]);

  const loadRecentScans = useCallback(async () => {
    try {
      const { data } = await api.get('/qr/scans', { params: { limit: 8 } });
      setRecentScans(data.data);
    } catch {
      setRecentScans([]);
    }
  }, []);

  useEffect(() => { loadRecentScans(); }, [loadRecentScans]);

  useEffect(() => {
    if (examId) setSearchParams({ examId });
  }, [examId]); // eslint-disable-line

  const selectedExam = exams.find((e) => e._id === examId);

  const loadRoster = useCallback(async (id) => {
    if (!id || !isOnline) { setRoster([]); setAttendedIds(new Set()); return; }
    setRosterLoading(true);
    try {
      const [{ data: rosterRes }, { data: attendanceRes }] = await Promise.all([
        api.get(`/exams/${id}/roster`),
        api.get(`/attendance/exam/${id}`),
      ]);
      setRoster(rosterRes.data);
      setAttendedIds(new Set(attendanceRes.data.map((r) => r.student?._id)));
    } catch {
      setRoster([]);
      setAttendedIds(new Set());
    } finally {
      setRosterLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { loadRoster(examId); }, [examId, loadRoster]);

  const handleSync = useCallback(async () => {
    if (!isOnline) return;
    setSyncing(true);
    try {
      const { synced } = await syncQueue();
      setQueueCount(getQueue().length);
      if (synced > 0) loadRoster(examId);
    } catch (err) {
      // Will retry automatically next time connection is confirmed
    } finally {
      setSyncing(false);
    }
  }, [isOnline, examId, loadRoster]);

  useEffect(() => {
    if (isOnline && getQueue().length > 0) handleSync();
  }, [isOnline, handleSync]);

  const recordFor = async (studentId) => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      if (isOnline) {
        const { data } = await api.post('/attendance', { studentId, examId });
        setResult({
          student: data.data.student,
          eligibilityStatus: data.data.eligibilityStatus,
          reason: data.data.eligibilityReason,
          synced: true,
        });
        setSessionCount((c) => c + 1);
        setAttendedIds((prev) => new Set(prev).add(data.data.student._id));
      } else {
        // Offline path: try to look up cached student info if available, otherwise queue blind.
        let student = null;
        try {
          const { data } = await api.get(`/students/lookup/${studentId}`);
          student = data.data;
        } catch {
          /* lookup may also fail offline; that's fine, we still queue it */
        }
        addToQueue({ studentId, examId });
        setQueueCount(getQueue().length);
        setResult({
          student: student || { studentId, fullName: 'Saved offline — details pending sync' },
          eligibilityStatus: 'Pending',
          reason: 'Stored on this device. Will verify and sync once internet connection returns.',
          synced: false,
        });
        setSessionCount((c) => c + 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;
    const studentId = studentIdInput.trim();
    setError('');
    setResult(null);
    setScanPreview(null);
    setPreviewLoading(true);

    try {
      const { data } = await api.get(`/students/lookup/${studentId}`);
      setScanPreview({
        studentId: data.data.studentId,
        student: data.data,
        scanStatus: 'Successful',
        message: 'Student profile verified by Student ID. Confirm identity before marking present.',
      });
      setStudentIdInput('');
    } catch (err) {
      setScanPreview({
        studentId,
        student: null,
        scanStatus: 'Student Not Found',
        message: err.response?.data?.message || 'Student not found. Check the Student ID and try again.',
      });
      setError(err.response?.data?.message || 'Student not found. Check the Student ID and try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const clearPreview = () => {
    setError('');
    setResult(null);
    setScanPreview(null);
  };

  // Called by the QR scanner after every scan. The server has already recorded
  // (or refused) the attendance; this only refreshes what the page displays.
  const handleQrOutcome = ({ kind, student, queued }) => {
    if (queued) {
      setQueueCount(getQueue().length);
      setSessionCount((c) => c + 1);
    } else if (kind === 'success' || (kind === 'rejected' && student?._id)) {
      setSessionCount((c) => c + (kind === 'success' ? 1 : 0));
      if (student?._id) setAttendedIds((prev) => new Set(prev).add(student._id));
    }
    loadRecentScans();
  };

  const confirmPreview = async () => {
    if (!scanPreview) return;
    const { studentId } = scanPreview;
    if (!studentId) return;
    if (!examId) {
      setError('Select an examination before recording attendance for this verified student.');
      return;
    }
    setScanPreview(null);
    await recordFor(studentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-ledger-900">Scan attendance</h1>
          <p className="text-ledger-400 text-sm mt-1">Choose your exam, then scan each student's QR code. Attendance is recorded and checked on the server.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral"><Users2 size={13} /> {sessionCount} recorded this session</Badge>
          {queueCount > 0 && (
            <button
              onClick={handleSync}
              disabled={!isOnline || syncing}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-pending/30 bg-pending/10 text-pending disabled:opacity-50"
            >
              <RefreshCcw size={13} className={syncing ? 'animate-spin' : ''} />
              {queueCount} pending sync
            </button>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 bg-pending/10 border border-pending/30 text-pending text-sm rounded-xl px-4 py-3">
          <WifiOff size={16} />
          You're offline — attendance is being saved on this device and will sync automatically once you're back online.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className={`${mode === 'manual' ? 'lg:col-span-3' : 'lg:col-span-5 lg:max-w-2xl lg:mx-auto lg:w-full'} bg-white rounded-2xl border border-ledger-100 shadow-card p-4 sm:p-6 space-y-5`}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400 mb-1.5">
              Examination
            </label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40"
            >
              <option value="">Select examination…</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.examName} — {exam.courseCode} ({exam.examRoom})
                </option>
              ))}
            </select>
            {selectedExam && (
              <p className="text-xs text-ledger-400 mt-2">
                {selectedExam.faculty} · {selectedExam.department} · Fee &amp; attendance standing always checked
              </p>
            )}
          </div>

          <div role="tablist" aria-label="Attendance method" className="grid grid-cols-2 gap-1 rounded-xl bg-ledger-50 p-1">
            {[['qr', 'Scan QR', Camera], ['manual', 'Enter Student ID', Keyboard]].map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${mode === key ? 'bg-white text-ledger-900 shadow-sm' : 'text-ledger-500 hover:text-ledger-700'}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {mode === 'qr' && (
            <QrAttendanceScanner exam={selectedExam} isOnline={isOnline} onOutcome={handleQrOutcome} />
          )}

          {mode === 'manual' && (
          <form onSubmit={handleScan} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-ledger-400">
              Student ID
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ledger-400" />
                <input
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Type Student ID (e.g. CS-2001)"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-ledger-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-seal/40"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-ledger-900 hover:bg-ledger-800 text-white font-medium text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                <ScanLine size={16} /> {loading ? 'Checking…' : 'Verify'}
              </button>
            </div>
          </form>
          )}

          {error && (
            <div className="bg-ineligible/10 border border-ineligible/30 text-ineligible text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {mode === 'manual' && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-ledger-100 shadow-card p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
          {previewLoading && (
            <p className="text-ledger-400 text-sm">Looking up student…</p>
          )}

          {!previewLoading && scanPreview && (
            <div className="flex flex-col items-center gap-4 w-full">
              {scanPreview.student ? (
                <div className="flex flex-col items-center gap-3">
                  {scanPreview.student.photoUrl ? (
                    <img src={scanPreview.student.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-ledger-100" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-ledger-100 text-ledger-500 flex items-center justify-center font-display text-2xl">
                      {scanPreview.student.fullName?.charAt(0)}
                    </div>
                  )}
                  <Badge tone={scanPreview.scanStatus === 'Successful' ? 'eligible' : 'ineligible'}>
                    <CheckCircle2 size={13} /> {scanPreview.scanStatus === 'Successful' ? 'Valid Student' : scanPreview.scanStatus}
                  </Badge>
                  <p className="font-display text-lg text-ledger-900">{scanPreview.student.fullName}</p>
                  <p className="text-ledger-400 text-xs font-mono mt-0.5">{scanPreview.student.studentId}</p>
                  <p className="text-ledger-400 text-xs mt-1">
                    {scanPreview.student.faculty} · {scanPreview.student.department}
                    {scanPreview.student.className ? ` · ${scanPreview.student.className}` : ''}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Badge tone={scanPreview.student.feeStatus === 'Cleared' ? 'eligible' : 'ineligible'}>{scanPreview.student.feeStatus}</Badge>
                    <Badge tone={(scanPreview.student.absenceCount || 0) > 3 ? 'ineligible' : 'neutral'}>
                      {scanPreview.student.absenceCount || 0} absences
                    </Badge>
                  </div>
                  {scanPreview.student.blocked && (
                    <div className="w-full bg-ineligible/10 border border-ineligible/30 text-ineligible text-sm rounded-xl px-4 py-3 text-center">
                      <p className="font-semibold">We can not present this student</p>
                      <p className="text-xs mt-1">{scanPreview.student.blockReason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Badge tone="ineligible">{scanPreview.scanStatus}</Badge>
                  <p className="font-display text-lg text-ledger-900 mt-3">Student not verified</p>
                  <p className="text-ledger-400 text-xs mt-1">{scanPreview.message}</p>
                </div>
              )}
              {scanPreview.message && scanPreview.student && (
                <p className="text-xs text-ledger-500 bg-ledger-50 rounded-lg px-3 py-2 max-w-xs">{scanPreview.message}</p>
              )}
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={clearPreview}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-ledger-500 border border-ledger-200 hover:bg-ledger-50"
                >
                  Check another
                </button>
                {scanPreview.student && !scanPreview.student.blocked && (
                  <button
                    onClick={confirmPreview}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60"
                  >
                    Mark Present <ArrowRight size={15} />
                  </button>
                )}
                {scanPreview.student?.blocked && (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-ledger-100 text-ledger-400 cursor-not-allowed"
                  >
                    Rejected — cannot mark present
                  </button>
                )}
              </div>
            </div>
          )}

          {!previewLoading && !scanPreview && !result && (
            <p className="text-ledger-400 text-sm">Student profile will appear here. Confirm identity, then mark present.</p>
          )}
          {!previewLoading && !scanPreview && result && (
            <div className="flex flex-col items-center gap-4">
              <EligibilityStamp status={result.eligibilityStatus} size="lg" />
              <div>
                <p className="font-display text-lg text-ledger-900">{result.student.fullName}</p>
                <p className="text-ledger-400 text-xs font-mono mt-0.5">{result.student.studentId}</p>
                {(result.student.faculty || result.student.department) && (
                  <p className="text-ledger-400 text-xs mt-1">
                    {result.student.faculty} {result.student.department ? `· ${result.student.department}` : ''}
                  </p>
                )}
              </div>
              {result.reason && (
                <p className="text-xs text-ledger-500 bg-ledger-50 rounded-lg px-3 py-2 max-w-xs">{result.reason}</p>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ledger-100 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-ledger-900">Recent QR scans</h2>
            <p className="text-ledger-400 text-xs mt-0.5">
              {user?.role === 'invigilator' ? 'Only scans made by your account are shown here.' : 'Recent QR verification attempts across all invigilators.'}
            </p>
          </div>
          <History size={18} className="text-ledger-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Scanned at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ledger-100">
              {recentScans.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-ledger-400 text-sm">No QR scans yet.</td></tr>
              )}
              {recentScans.map((scan) => (
                <tr key={scan._id} className="hover:bg-ledger-50/60">
                  <td className="px-6 py-3">
                    <p className="font-medium text-ledger-900">{scan.student?.fullName || 'Unknown student'}</p>
                    <p className="text-ledger-400 text-xs font-mono">{scan.studentIdSnapshot || 'No student ID'}</p>
                  </td>
                  <td className="px-6 py-3">
                    <Badge tone={scan.scanStatus === 'Successful' ? 'eligible' : scan.scanStatus === 'Duplicate scan' ? 'pending' : 'ineligible'}>{scan.scanStatus}</Badge>
                  </td>
                  <td className="px-6 py-3 text-ledger-600">{new Date(scan.scannedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {examId && (
        <div className="bg-white rounded-2xl border border-ledger-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-ledger-100 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-ledger-900">Students taking this exam</h2>
              <p className="text-ledger-400 text-xs mt-0.5">
                {selectedExam?.faculty} · {selectedExam?.department} — matched from the student directory.
              </p>
            </div>
            <Badge tone="neutral">
              <Users2 size={13} /> {attendedIds.size} / {roster.length} present
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-ledger-400 text-xs uppercase tracking-wide border-b border-ledger-100">
                  <th className="px-6 py-3 font-semibold">Student</th>
                  <th className="px-6 py-3 font-semibold">Fee status</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-100">
                {!rosterLoading && !isOnline && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-ledger-400 text-sm">
                    Roster needs a connection — reconnect to view expected students.
                  </td></tr>
                )}
                {!rosterLoading && isOnline && roster.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-ledger-400 text-sm">
                    No students found in this exam's Faculty / Department.
                  </td></tr>
                )}
                {roster.map((s) => (
                  <tr key={s._id} className="hover:bg-ledger-50/60">
                    <td className="px-6 py-3">
                      <p className="font-medium text-ledger-900">{s.fullName}</p>
                      <p className="text-ledger-400 text-xs font-mono mt-0.5">{s.studentId}</p>
                    </td>
                    <td className="px-6 py-3"><Badge tone={s.feeStatus === 'Cleared' ? 'eligible' : 'ineligible'}>{s.feeStatus}</Badge></td>
                    <td className="px-6 py-3">
                      {attendedIds.has(s._id)
                        ? <Badge tone="eligible">Present</Badge>
                        : <span className="text-ledger-400 text-xs">Not yet scanned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanAttendance;
