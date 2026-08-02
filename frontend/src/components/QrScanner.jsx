import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Loader2, Play, Square, Upload } from 'lucide-react';

let instanceCounter = 0;
const BACK_CAMERA_OPTION = '';

const findBackCamera = (devices = []) => (
  devices.find((device) => /back|rear|environment/i.test(device.label || ''))
);

const normalizeCameraDevices = (devices = []) => (
  devices.filter((device) => device?.id)
);

const QrScanner = ({ onScan, onError }) => {
  const elementId = useRef(`qr-scanner-${++instanceCounter}`).current;
  const scannerRef = useRef(null);
  const hasFiredRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Opening the back camera...');
  const isSecureCameraContext = window.isSecureContext || window.location.hostname === 'localhost';
  const isHttpLanAddress = window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname);

  const explainCameraError = (err) => {
    const rawMessage = typeof err === 'string' ? err : err?.message || '';
    const lower = rawMessage.toLowerCase();

    if (!isSecureCameraContext || lower.includes('not supported')) {
      return 'Live camera is blocked because this page is open with HTTP. Open the HTTPS phone URL, or use Camera Scan (photo) below.';
    }
    if (lower.includes('permission') || lower.includes('notallowed')) {
      return 'Camera access was denied. Open browser settings and allow camera permission for this website.';
    }
    if (lower.includes('overconstrained') || lower.includes('constraint')) {
      return 'The selected camera could not start. Choose Back camera and try again.';
    }
    if (lower.includes('notfound') || lower.includes('no camera')) {
      return 'No camera was found on this device. Connect a camera or try another browser.';
    }
    return rawMessage || 'Could not access the camera. Check permissions and try again.';
  };

  const refreshCameras = async ({ keepCurrent = true } = {}) => {
    const devices = normalizeCameraDevices(await Html5Qrcode.getCameras());
    setCameras(devices);

    const currentStillExists = devices.some((device) => device.id === cameraId);
    if (keepCurrent && cameraId && currentStillExists) return devices;

    const backCamera = findBackCamera(devices);
    if (backCamera) {
      setCameraId(backCamera.id);
    } else if (!cameraId || !currentStillExists) {
      setCameraId(BACK_CAMERA_OPTION);
    }

    return devices;
  };

  const cameraConfigFor = (selectedCameraId) => (
    selectedCameraId
      ? selectedCameraId
      : { facingMode: { ideal: 'environment' } }
  );

  const stopCamera = async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      await instance.clear();
    } catch {
      // The camera may already be stopped by the browser or component unmount.
    } finally {
      setRunning(false);
      setMessage((current) => current || 'Camera stopped.');
    }
  };

  const startCamera = async (selectedCameraId = cameraId) => {
    if (!isSecureCameraContext) {
      const secureMessage = 'Live camera is blocked because this page is open with HTTP. Open the HTTPS phone URL, or use Camera Scan (photo) below.';
      setMessage(secureMessage);
      onError?.(secureMessage);
      return;
    }

    setLoading(true);
    setMessage('');
    hasFiredRef.current = false;

    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(elementId);
      if (scannerRef.current.isScanning) await stopCamera();

      const config = {
        fps: 12,
        disableFlip: true,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(Math.min(320, Math.max(220, minEdge * 0.72)));
          return { width: size, height: size };
        },
      };
      const cameraConfig = cameraConfigFor(selectedCameraId);

      await scannerRef.current.start(
        cameraConfig,
        config,
        async (decodedText) => {
          if (hasFiredRef.current) return;
          hasFiredRef.current = true;
          await stopCamera();
          onScan(decodedText);
        },
        () => {}
      );
      setRunning(true);
      setMessage('Back camera is active. Hold the QR code inside the square until it scans.');
      refreshCameras({ keepCurrent: Boolean(selectedCameraId) }).catch(() => {});
    } catch (err) {
      const friendly = explainCameraError(err);
      setMessage(friendly);
      onError?.(friendly);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    if (!isSecureCameraContext) {
      setMessage('Live camera is blocked because this page is open with HTTP. Open the HTTPS phone URL, or use Camera Scan (photo) below.');
    } else {
      refreshCameras()
        .catch(() => {
          setMessage('Requesting camera permission...');
        })
        .finally(() => {
          if (hasAutoStartedRef.current) return;
          hasAutoStartedRef.current = true;
          startCamera(BACK_CAMERA_OPTION);
        });
    }

    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  const handleCameraChange = async (e) => {
    const nextCameraId = e.target.value;
    setCameraId(nextCameraId);
    if (running) {
      await stopCamera();
      await startCamera(nextCameraId);
    }
  };

  const handleImageScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLoading(true);
    setMessage('Reading QR code from photo…');
    hasFiredRef.current = false;

    try {
      await stopCamera();
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(elementId);
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
    } catch {
      const photoMessage = 'Could not read a QR code from that photo. Hold the QR code flat, fill the camera frame, and try again.';
      setMessage(photoMessage);
      onError?.(photoMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {isHttpLanAddress && (
        <div className="rounded-xl border border-pending/30 bg-pending/10 px-3 py-2 text-xs text-pending">
          Live camera requires HTTPS for this network address. Use the HTTPS URL for live scanning, or tap Camera Scan (photo) below to take a picture of the QR code instead.
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Camera size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ledger-400" />
          <select
            value={cameraId}
            onChange={handleCameraChange}
            disabled={cameras.length === 0 || loading}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-ledger-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-seal/40 disabled:bg-ledger-50 disabled:text-ledger-400"
          >
            <option value={BACK_CAMERA_OPTION}>
              {cameras.length === 0 ? 'Back camera' : 'Back camera (recommended)'}
            </option>
            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => (running ? stopCamera() : startCamera())}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ledger-900 hover:bg-ledger-800 text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : running ? <Square size={16} /> : <Play size={16} />}
          {loading ? 'Starting…' : running ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className={`relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-ledger-200 text-ledger-600 hover:bg-ledger-50 ${loading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Camera Scan (photo)
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageScan}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
        </label>
      </div>
      {message && <p className="text-xs text-ledger-500 bg-ledger-50 rounded-lg px-3 py-2">{message}</p>}
      <div id={elementId} className="qr-camera-frame w-full min-h-[280px] rounded-xl overflow-hidden bg-ledger-950" />
    </div>
  );
};

export default QrScanner;
