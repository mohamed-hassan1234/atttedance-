import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, RefreshCw, ScanLine, SwitchCamera, Upload, Zap, ZapOff } from 'lucide-react';
import { createOcrCameraSession } from '../services/ocrCameraSession';
import { explainCameraError } from '../services/cameraSession';
import { captureIdRegion } from '../utils/imagePreprocess';
import { recognizeImage, warmUp } from '../services/ocrRecognitionService';
import { parseOcrText } from '../utils/studentIdParser';

const BACK_CAMERA = { facingMode: 'environment' };
const REAR_LABEL = /back|rear|environment/i;
// The guide box below is centered, 68% of the frame's smaller side — this is
// the same region captureIdRegion() crops before handing it to OCR, so what
// the invigilator sees lined up is exactly what gets recognized.
const CROP_RATIO = { x: 0.16, y: 0.3, width: 0.68, height: 0.4 };
const AUTO_CAPTURE_MS = 1800;

const isSecureCameraContext = () => (
  window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname)
);

// Live camera + OCR capture loop for a Hormuud University student ID card.
// Owns the camera stream, the scan-frame overlay, torch/switch controls, and
// when to run a recognition attempt (periodic auto-capture, or the invigilator
// tapping "Recognize now" / the Space/Enter key). It has no opinion about what
// a recognized ID means — it only reports `onResult(parseOcrText output)`; the
// parent (OcrAttendanceScanner) decides what to do with it.
//
// onStatus receives { state: 'requesting-camera' | 'scanning' | 'recognizing' | 'stopped' | 'camera-error', error? }.
const OcrCameraView = ({ onResult, onStatus, paused = false }) => {
  const videoRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onStatusRef = useRef(onStatus);
  onResultRef.current = onResult;
  onStatusRef.current = onStatus;

  const session = useMemo(() => createOcrCameraSession(), []);

  const [status, setStatus] = useState({ state: 'requesting-camera' });
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null);
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [recognizing, setRecognizing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  const publish = useCallback((next) => {
    setStatus(next);
    onStatusRef.current?.(next);
  }, []);

  useEffect(() => { warmUp(); }, []);

  useEffect(() => {
    let cancelled = false;
    setTorch({ supported: false, on: false });

    if (stopped) return undefined;

    if (!isSecureCameraContext() || !navigator.mediaDevices?.getUserMedia) {
      publish({
        state: 'camera-error',
        error: explainCameraError(
          isSecureCameraContext() ? 'getUserMedia not supported' : 'secure context',
          { isSecureContext: isSecureCameraContext() }
        ),
      });
      return undefined;
    }

    publish({ state: 'requesting-camera' });
    const constraints = { video: cameraId ? { deviceId: { exact: cameraId } } : BACK_CAMERA, audio: false };

    session
      .start(constraints)
      .then(async (result) => {
        if (cancelled || !result.started) return;
        if (videoRef.current) {
          videoRef.current.srcObject = result.stream;
          await videoRef.current.play().catch(() => {});
        }
        if (cancelled) return;
        publish({ state: 'scanning' });

        try {
          const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput' && d.deviceId);
          if (!cancelled) setCameras(devices);
        } catch { /* switching just stays hidden */ }

        try {
          const [track] = result.stream.getVideoTracks();
          const caps = track.getCapabilities?.();
          if (!cancelled) setTorch({ supported: Boolean(caps?.torch), on: false });
        } catch { /* torch unsupported */ }
      })
      .catch((err) => {
        if (!cancelled) publish({ state: 'camera-error', error: explainCameraError(err) });
      });

    return () => {
      cancelled = true;
      session.stop();
    };
  }, [session, cameraId, attempt, stopped, publish]);

  useEffect(() => () => session.stop(), [session]);

  // Runs one recognition attempt on the current frame. Guarded so overlapping
  // OCR jobs can never happen: a capture already in flight, the camera not yet
  // ready, or the parent flow being busy with a previous result all skip it.
  const runCapture = useCallback(async () => {
    if (recognizing || paused || status.state !== 'scanning' || !videoRef.current) return;
    setRecognizing(true);
    publish({ state: 'recognizing' });
    try {
      const canvas = captureIdRegion(videoRef.current, CROP_RATIO);
      const { text, confidence } = await recognizeImage(canvas);
      const result = parseOcrText(text, { confidence });
      onResultRef.current?.({ ...result, confidence, rawText: text, previewDataUrl: canvas.toDataURL('image/png') });
    } catch (err) {
      onResultRef.current?.({ ok: false, studentId: null, candidates: [], needsConfirmation: false, reason: 'Could not read the image. Try again.', error: err });
    } finally {
      setRecognizing(false);
      publish({ state: 'scanning' });
    }
  }, [recognizing, paused, status.state, publish]);

  // Background auto-capture: tries every ~1.8s so the invigilator does not
  // have to tap a button for every card, but never while a job is running,
  // paused, or the parent is already showing/confirming a result.
  useEffect(() => {
    if (paused || status.state !== 'scanning') return undefined;
    const id = setInterval(() => { runCapture(); }, AUTO_CAPTURE_MS);
    return () => clearInterval(id);
  }, [paused, status.state, runCapture]);

  const toggleTorch = async () => {
    try {
      const [track] = session.getStream()?.getVideoTracks() || [];
      const next = !torch.on;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorch({ supported: true, on: next });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === cameraId);
    const rear = cameras.findIndex((c) => REAR_LABEL.test(c.label || ''));
    const activeIndex = currentIndex >= 0 ? currentIndex : Math.max(rear, 0);
    setCameraId(cameras[(activeIndex + 1) % cameras.length].deviceId);
  };

  const startCamera = () => { setStopped(false); setAttempt((n) => n + 1); };
  const stopCamera = () => { setStopped(true); session.stop(); publish({ state: 'stopped' }); };

  // Fallback for browsers/contexts without live camera, or a preference to
  // photograph the card with the device's own camera app.
  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || recognizing) return; // never run a photo recognition alongside a live-capture job
    setFileBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const { text, confidence } = await recognizeImage(bitmap);
      const result = parseOcrText(text, { confidence });
      onResultRef.current?.({ ...result, confidence, rawText: text, source: 'photo' });
    } catch {
      onResultRef.current?.({ ok: false, studentId: null, candidates: [], needsConfirmation: false, reason: 'Could not read the photo. Try again.' });
    } finally {
      setFileBusy(false);
    }
  };

  const scanning = status.state === 'scanning' || status.state === 'recognizing';
  const failed = status.state === 'camera-error';

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl bg-ledger-950 aspect-[3/4] max-h-[65vh] sm:aspect-[4/3] landscape:aspect-[16/9]">
        <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />

        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4" aria-hidden="true">
            <div
              className={`relative w-[68%] max-w-[420px] rounded-xl border-2 ${paused ? 'border-white/30' : 'border-white/70'} shadow-[0_0_0_9999px_rgba(11,18,32,0.45)] transition-colors`}
              style={{ aspectRatio: `${CROP_RATIO.width} / ${CROP_RATIO.height}` }}
            >
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-brand" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-brand" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-brand" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-brand" />
            </div>
            <p className="absolute bottom-4 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
              {status.state === 'recognizing' ? (
                <><Loader2 size={12} className="animate-spin" /> Reading Student ID…</>
              ) : (
                'Align the Student ID line inside the frame'
              )}
            </p>
          </div>
        )}

        {status.state === 'requesting-camera' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white" role="status">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Starting camera… allow access if your browser asks.</p>
          </div>
        )}

        {status.state === 'stopped' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <CameraOff size={28} className="text-white/70" />
            <p className="text-sm">Camera stopped.</p>
            <button
              type="button"
              onClick={startCamera}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-ledger-900"
            >
              <Camera size={16} /> Start camera
            </button>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ledger-950 p-6 text-center text-white" role="alert">
            <CameraOff size={30} className="text-white/70" />
            <p className="max-w-xs text-sm">{status.error?.message}</p>
            {status.error?.code !== 'insecure-context' && status.error?.code !== 'unsupported' && status.error?.code !== 'no-camera' && (
              <button
                type="button"
                onClick={startCamera}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-ledger-900"
              >
                <RefreshCw size={16} /> Try again
              </button>
            )}
          </div>
        )}

        {scanning && (
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            {torch.supported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-pressed={torch.on}
                aria-label={torch.on ? 'Turn flash off' : 'Turn flash on'}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
              >
                {torch.on ? <ZapOff size={20} /> : <Zap size={20} />}
              </button>
            )}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <SwitchCamera size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={stopCamera}
              aria-label="Stop camera"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <CameraOff size={18} />
            </button>
          </div>
        )}
      </div>

      {scanning && (
        <button
          type="button"
          onClick={runCapture}
          disabled={recognizing || paused}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-deep text-sm font-medium text-white hover:bg-brand-deep/90 disabled:opacity-60"
        >
          {recognizing ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
          {recognizing ? 'Reading…' : 'Capture / Recognize now'}
        </button>
      )}

      <label className={`relative flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-ledger-200 px-4 text-sm font-medium text-ledger-600 hover:bg-ledger-50 ${fileBusy || recognizing ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
        {fileBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        Upload / take a photo of the ID card instead
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          disabled={fileBusy || recognizing}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
};

export default OcrCameraView;
