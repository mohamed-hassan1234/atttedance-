// Single place that turns whatever the invigilator's camera decoded (a QR code or
// a barcode on the student ID card) into a Student ID such as HU1234. Only the
// Student ID is read: the student, eligibility and authorization all come from
// the database, so anything else in the payload (e.g. "eligible": true) is ignored.
//
// Supported payloads:
//   HU1234                          (bare Student ID)
//   {"studentId":"HU1234"}          (JSON with a studentId field)
//   Name: Ahmed Ali  ID: HU1234     (text that contains exactly one Student ID)

// Student ID format: 2-4 letters followed by 3-8 digits, e.g. HU1234.
const STUDENT_ID_PATTERN = /^[A-Z]{2,4}\d{3,8}$/;
const STUDENT_ID_IN_TEXT = /(?<![A-Z0-9])[A-Z]{2,4}\d{3,8}(?![A-Z0-9])/g;
const MAX_PAYLOAD_LENGTH = 2048;

// Returns the upper-cased Student ID, or '' when the payload holds no Student ID
// (or more than one, since then it is unclear which student was scanned).
const extractStudentId = (raw) => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_PAYLOAD_LENGTH) return '';

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const id = parsed && typeof parsed.studentId === 'string' ? parsed.studentId.trim().toUpperCase() : '';
      return STUDENT_ID_PATTERN.test(id) ? id : '';
    } catch {
      return '';
    }
  }

  const found = [...new Set(trimmed.toUpperCase().match(STUDENT_ID_IN_TEXT) || [])];
  return found.length === 1 ? found[0] : '';
};

// ---- Legacy token payloads ---------------------------------------------------
// Older SEAMS QR codes carried an opaque token instead of the Student ID. Scans
// queued offline with those codes can still be synced, so token parsing stays.
//   {"type":"student_verification","token":"<token>"}
//   https://host/verify-student/<token>
//   <token>

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const extractCandidate = (trimmed) => {
  if (trimmed.startsWith('{')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return '';
    }
    if (parsed && parsed.type === 'student_verification' && typeof parsed.token === 'string') {
      return parsed.token.trim();
    }
    return '';
  }

  try {
    const url = new URL(trimmed);
    return url.pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    if (trimmed.includes('/verify-student/')) {
      return trimmed.split('/verify-student/').pop().split(/[?#]/)[0];
    }
    return trimmed;
  }
};

// Returns the token string, or '' when the payload is unusable.
const extractQrToken = (raw) => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_PAYLOAD_LENGTH) return '';
  const candidate = extractCandidate(trimmed);
  return TOKEN_PATTERN.test(candidate) ? candidate : '';
};

module.exports = { extractStudentId, STUDENT_ID_PATTERN, extractQrToken, TOKEN_PATTERN };
