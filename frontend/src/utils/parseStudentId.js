// Turns whatever the camera decoded (a QR code or a barcode on the student ID
// card) into a Student ID such as HU1234. Only the Student ID is read: anything
// else in the payload is ignored, and the server stays the source of truth.
//
// Accepted payloads:
//   HU1234                          (bare Student ID)
//   {"studentId":"HU1234"}          (JSON with a studentId field)
//   Name: Ahmed Ali  ID: HU1234     (text that contains exactly one Student ID)
//
// Mirror of extractStudentId in backend/src/utils/qrPayload.js, which is
// authoritative and re-parses every request. This copy exists for instant
// client-side rejection and so offline scans can be queued by Student ID.

// Student ID format: 2-4 letters followed by 3-8 digits, e.g. HU1234.
const STUDENT_ID_PATTERN = /^[A-Z]{2,4}\d{3,8}$/;
const STUDENT_ID_IN_TEXT = /(?<![A-Z0-9])[A-Z]{2,4}\d{3,8}(?![A-Z0-9])/g;
const MAX_PAYLOAD_LENGTH = 2048;
const INVALID = { ok: false, error: 'No Student ID found.' };

const fromJson = (text) => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed.studentId === 'string' ? parsed.studentId.trim().toUpperCase() : '';
  } catch {
    return '';
  }
};

/** @returns {{ ok: true, studentId: string } | { ok: false, error: string }} */
export const parseStudentId = (raw) => {
  if (typeof raw !== 'string') return INVALID;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_PAYLOAD_LENGTH) return INVALID;

  if (trimmed.startsWith('{')) {
    const id = fromJson(trimmed);
    return STUDENT_ID_PATTERN.test(id) ? { ok: true, studentId: id } : INVALID;
  }

  // More than one ID in the code means we cannot tell which student this is.
  const found = [...new Set(trimmed.toUpperCase().match(STUDENT_ID_IN_TEXT) || [])];
  return found.length === 1 ? { ok: true, studentId: found[0] } : INVALID;
};
