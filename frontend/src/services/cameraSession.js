// Owns the lifecycle of one camera scanner. Framework-agnostic so the
// start/stop ordering can be tested without a browser.
//
// Every start/stop is serialised on one promise chain and tagged with a
// generation number, so React StrictMode's mount -> unmount -> mount, rapid
// camera switches, and unmount-while-starting can never leave two streams open
// or a camera running after the scanner is closed.

export const createCameraSession = ({ createScanner, releaseStreams = () => {} }) => {
  let scanner = null;
  let generation = 0;
  let chain = Promise.resolve();

  const enqueue = (task) => {
    const next = chain.then(task);
    chain = next.catch(() => {});
    return next;
  };

  const teardown = async () => {
    const current = scanner;
    scanner = null;
    releaseStreams(); // stop MediaStream tracks even if the library missed one
    if (!current) return;
    try {
      if (current.isScanning) await current.stop();
    } catch {
      /* already stopped by the browser */
    }
    try {
      current.clear();
    } catch {
      /* element already gone */
    }
    releaseStreams();
  };

  const start = (cameraConfig, scanConfig, onDecode) => {
    const mine = ++generation;
    return enqueue(async () => {
      if (mine !== generation) return { started: false };
      await teardown();

      const instance = createScanner();
      scanner = instance;
      try {
        await instance.start(
          cameraConfig,
          scanConfig,
          (text) => { if (mine === generation) onDecode(text); },
          () => {} // per-frame "no QR found" callback
        );
      } catch (error) {
        if (scanner === instance) await teardown();
        throw error;
      }
      if (mine !== generation) {
        await teardown();
        return { started: false };
      }
      return { started: true, scanner: instance };
    });
  };

  const stop = () => {
    generation += 1;
    return enqueue(teardown);
  };

  return { start, stop, getScanner: () => scanner };
};

// Maps the assorted things getUserMedia / html5-qrcode throw (DOMException,
// strings, Errors) to a stable code plus a message an invigilator can act on.
export const explainCameraError = (err, { isSecureContext = true } = {}) => {
  const text = `${err?.name || ''} ${typeof err === 'string' ? err : err?.message || ''}`.toLowerCase();

  if (!isSecureContext || text.includes('secure context') || text.includes('only secure origins')) {
    return {
      code: 'insecure-context',
      message: 'The camera only works over HTTPS (or localhost). Open the secure HTTPS address of this site, or enter the Student ID manually.',
    };
  }
  if (text.includes('notallowed') || text.includes('permission') || text.includes('denied')) {
    return {
      code: 'permission-denied',
      message: 'Camera permission was denied. Enable camera access in your browser settings or enter the Student ID manually.',
    };
  }
  if (text.includes('notfound') || text.includes('no camera') || text.includes('requested device not found') || text.includes('devicesnotfound')) {
    return { code: 'no-camera', message: 'No camera was found on this device. Enter the Student ID manually.' };
  }
  if (text.includes('notreadable') || text.includes('in use') || text.includes('could not start video source') || text.includes('trackstart')) {
    return {
      code: 'camera-in-use',
      message: 'The camera is already in use by another app or browser tab. Close it and try again.',
    };
  }
  if (text.includes('overconstrained') || text.includes('constraint')) {
    return { code: 'overconstrained', message: 'This camera could not be started. Try switching cameras.' };
  }
  if (text.includes('not supported') || text.includes('getusermedia') || text.includes('mediadevices')) {
    return { code: 'unsupported', message: 'This browser does not support camera scanning. Enter the Student ID manually.' };
  }
  return { code: 'unknown', message: 'The camera could not be started. Try again, or enter the Student ID manually.' };
};
