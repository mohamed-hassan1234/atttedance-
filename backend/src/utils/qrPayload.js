// Single place that turns whatever a QR scanner decoded into the opaque student
// QR token. The QR is only an identifier: the token is looked up server-side and
// nothing else in the payload (e.g. an injected "eligible" flag) is ever read.
//
// Supported payloads (all produced by, or compatible with, the Students page):
//   {"type":"student_verification","token":"<token>"}   (current format)
//   https://host/verify-student/<token>                  (URL form)
//   <token>                                              (bare token)

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_PAYLOAD_LENGTH = 2048;

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

module.exports = { extractQrToken, TOKEN_PATTERN };
