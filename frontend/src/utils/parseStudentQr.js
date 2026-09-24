// Turns whatever the camera decoded into the opaque student QR token.
//
// What SEAMS student QR codes actually contain (see Students.jsx):
//   {"type":"student_verification","token":"<64-hex token>"}
// The QR carries a revocable token, not the Student ID, so the server resolves
// token -> student. Legacy URL (".../verify-student/<token>") and bare-token
// payloads are accepted too. Nothing else in the payload is ever read, and the
// result is only a lookup key: the server stays the source of truth.
//
// Mirror of backend/src/utils/qrPayload.js, which is authoritative and re-parses
// every request. This copy exists for instant client-side rejection and so
// offline scans can be queued in a normalised form.

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_PAYLOAD_LENGTH = 2048;

const candidateFrom = (trimmed) => {
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'student_verification' && typeof parsed.token === 'string') {
        return parsed.token.trim();
      }
    } catch {
      /* not valid JSON */
    }
    return '';
  }

  try {
    return new URL(trimmed).pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    if (trimmed.includes('/verify-student/')) {
      return trimmed.split('/verify-student/').pop().split(/[?#]/)[0];
    }
    return trimmed;
  }
};

/** @returns {{ ok: true, token: string } | { ok: false, error: string }} */
export const parseStudentQr = (raw) => {
  if (typeof raw !== 'string') return { ok: false, error: 'Invalid student QR code.' };
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_PAYLOAD_LENGTH) return { ok: false, error: 'Invalid student QR code.' };

  const token = candidateFrom(trimmed);
  if (!TOKEN_PATTERN.test(token)) return { ok: false, error: 'Invalid student QR code.' };
  return { ok: true, token };
};
