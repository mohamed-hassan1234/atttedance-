// Owns the lifecycle of one raw getUserMedia camera stream for the OCR
// scanner. This is the OCR-path counterpart of services/cameraSession.js
// (which wraps html5-qrcode's own start/stop instead) — OCR drives the
// <video> element itself so it can grab frames for recognition, so it needs
// a plain MediaStream rather than a QR-decoding library instance.
//
// Same concurrency guarantee as cameraSession.js, for the same reason: every
// start/stop is serialised on one promise chain and tagged with a generation
// number, so React mount/unmount churn, rapid camera switches, and
// unmount-while-starting can never leave two streams open or a camera running
// after the scanner is closed.

export const createOcrCameraSession = ({ getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c) } = {}) => {
  let stream = null;
  let generation = 0;
  let chain = Promise.resolve();

  const enqueue = (task) => {
    const next = chain.then(task);
    chain = next.catch(() => {});
    return next;
  };

  const teardown = () => {
    const current = stream;
    stream = null;
    if (!current) return;
    current.getTracks().forEach((track) => {
      try { track.stop(); } catch { /* already stopped */ }
    });
  };

  const start = (constraints) => {
    const mine = ++generation;
    return enqueue(async () => {
      if (mine !== generation) return { started: false };
      teardown();

      let newStream;
      try {
        newStream = await getUserMedia(constraints);
      } catch (error) {
        if (mine === generation) throw error;
        return { started: false };
      }

      if (mine !== generation) {
        newStream.getTracks().forEach((track) => { try { track.stop(); } catch { /* noop */ } });
        return { started: false };
      }
      stream = newStream;
      return { started: true, stream: newStream };
    });
  };

  const stop = () => {
    generation += 1;
    return enqueue(teardown);
  };

  return { start, stop, getStream: () => stream };
};
