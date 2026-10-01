import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, Loader2, RefreshCw, SwitchCamera, Upload, Zap, ZapOff } from 'lucide-react';
import { createCameraSession, explainCameraError } from '../services/cameraSession';

let instanceCounter = 0;

const SCAN_CONFIG = { fps: 10, disableFlip: true };
const BACK_CAMERA = { facingMode: 'environment' };
const REAR_LABEL = /back|rear|environment/i;
// Student ID cards carry the ID as a QR code or a 1D barcode.
const ID_CARD_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
];

const isSecureCameraContext = () => (
  window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname)
);

// Live camera scanner for student ID cards (QR code or barcode). It only reports what it decodes (`onDecode`); the parent
// decides what to do with it and locks out repeat detections. The camera stays
// open between students and is released when this component unmounts.
//
// onStatus receives { state: 'requesting-camera' | 'scanning' | 'camera-error', error? }.
const QrScanner = ({ onDecode, onStatus, paused = false }) => {
  const ids = useRef(null);
  if (!ids.current) {
    instanceCounter += 1;
    ids.current = { view: `qr-view-${instanceCounter}`, file: `qr-file-${instanceCounter}` };
  }
  const containerRef = useRef(null);
  const onDecodeRef = useRef(onDecode);
  const onStatusRef = useRef(onStatus);
  onDecodeRef.current = onDecode;
  onStatusRef.current = onStatus;

  const session = useMemo(() => createCameraSession({
    createScanner: () => new Html5Qrcode(ids.current.view, {
      formatsToSupport: ID_CARD_FORMATS,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    }),
    releaseStreams: () => {
      containerRef.current?.querySelectorAll('video').forEach((video) => {
        video.srcObject?.getTracks?.().forEach((track) => track.stop());
      });
    },
  }), []);

  const [status, setStatus] = useState({ state: 'requesting-camera' });
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null); // null => facingMode: environment
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const publish = useCallback((next) => {
    setStatus(next);
    onStatusRef.current?.(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTorch({ supported: false, on: false });

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
    session
      .start(cameraId ? { deviceId: { exact: cameraId } } : BACK_CAMERA, SCAN_CONFIG, (text) => onDecodeRef.current?.(text))
      .then(async (result) => {
        if (cancelled || !result.started) return;
        publish({ state: 'scanning' });

        // Labels/ids are only reliable once permission has been granted.
        try {
          const found = (await Html5Qrcode.getCameras()).filter((d) => d?.id);
          if (!cancelled) setCameras(found);
        } catch { /* switching just stays hidden */ }

        try {
          const torchFeature = result.scanner.getRunningTrackCameraCapabilities().torchFeature();
          if (!cancelled) setTorch({ supported: torchFeature.isSupported(), on: false });
        } catch { /* torch unsupported */ }
      })
      .catch((err) => {
        if (!cancelled) publish({ state: 'camera-error', error: explainCameraError(err) });
      });

    return () => {
      cancelled = true;
      session.stop();
    };
  }, [session, cameraId, attempt, publish]);

  const toggleTorch = async () => {
    try {
      const feature = session.getScanner().getRunningTrackCameraCapabilities().torchFeature();
      const next = !torch.on;
      await feature.apply(next);
      setTorch({ supported: true, on: next });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === cameraId);
    const rear = cameras.findIndex((c) => REAR_LABEL.test(c.label || ''));
    const activeIndex = currentIndex >= 0 ? currentIndex : Math.max(rear, 0);
    setCameraId(cameras[(activeIndex + 1) % cameras.length].id);
  };

  // Fallback for browsers/contexts without live camera: decode one photo.
  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    const reader = new Html5Qrcode(ids.current.file, { formatsToSupport: ID_CARD_FORMATS, verbose: false });
    try {
      onDecodeRef.current?.(await reader.scanFile(file, false));
    } catch {
      onDecodeRef.current?.('');
    } finally {
      try { reader.clear(); } catch { /* nothing to clear */ }
      setPhotoBusy(false);
    }
  };

  const scanning = status.state === 'scanning';
  const failed = status.state === 'camera-error';

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl bg-ledger-950 aspect-[3/4] max-h-[65vh] sm:aspect-[4/3] landscape:aspect-[16/9]"
      >
        <div id={ids.current.view} className="qr-camera-frame absolute inset-0" />

        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4" aria-hidden="true">
            <div className={`relative aspect-square w-[68%] max-w-[320px] rounded-2xl border-2 ${paused ? 'border-white/30' : 'border-white/70'} shadow-[0_0_0_9999px_rgba(11,18,32,0.45)] transition-colors`}>
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-seal" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-seal" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-seal" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-seal" />
            </div>
            <p className="absolute bottom-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
              Point at the Student ID code on the card
            </p>
          </div>
        )}

        {status.state === 'requesting-camera' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white" role="status">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Starting camera… allow access if your browser asks.</p>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ledger-950 p-6 text-center text-white" role="alert">
            <CameraOff size={30} className="text-white/70" />
            <p className="max-w-xs text-sm">{status.error?.message}</p>
            {status.error?.code !== 'insecure-context' && status.error?.code !== 'unsupported' && status.error?.code !== 'no-camera' && (
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-ledger-900"
              >
                <RefreshCw size={16} /> Try again
              </button>
            )}
          </div>
        )}

        {scanning && (torch.supported || cameras.length > 1) && (
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
          </div>
        )}
      </div>

      {failed && (
        <label className={`relative flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-ledger-200 px-4 text-sm font-medium text-ledger-600 hover:bg-ledger-50 ${photoBusy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
          {photoBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Take a photo of the student ID card instead
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            disabled={photoBusy}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      )}
      <div id={ids.current.file} className="hidden" />
    </div>
  );
};

export default QrScanner;
