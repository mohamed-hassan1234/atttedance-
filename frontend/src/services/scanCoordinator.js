// Scan lock. A camera reports the same QR many times per second; this lets
// exactly one detection through and ignores everything else until release().
// The lock is set synchronously on the first detection (not via React state), so
// two frames in the same tick cannot both get through.

export const createScanCoordinator = ({ submit, cooldownMs = 3000, now = () => Date.now() }) => {
  let locked = false;
  let lastValue = null;
  let lastAt = 0;

  const handleDetection = (value) => {
    if (locked) return false;
    // After release, still ignore the same code for a moment so a QR that is
    // still in front of the camera is not scanned twice.
    if (value === lastValue && now() - lastAt < cooldownMs) return false;

    locked = true;
    lastValue = value;
    lastAt = now();
    Promise.resolve()
      .then(() => submit(value))
      .catch(() => { /* submit is responsible for surfacing its own errors */ });
    return true;
  };

  const release = () => {
    locked = false;
    lastAt = now();
  };

  return { handleDetection, release, isLocked: () => locked };
};
