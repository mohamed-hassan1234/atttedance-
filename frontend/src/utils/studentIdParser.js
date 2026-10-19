// Turns OCR text read off a physical Hormuud University student ID card into a
// Student ID such as HU00004698. This is the OCR counterpart of parseStudentId.js
// (which still handles QR/manual-entry payloads) — parseStudentId.js imports
// STUDENT_ID_PATTERN from here so the accepted format is defined in exactly one
// place on the frontend, mirroring backend/src/utils/qrPayload.js.
//
// Student ID format, confirmed from backend/src/models/Student.js + seedData.js:
// 2-4 uppercase letters followed by 3-8 digits, e.g. HU2001, HU00004698.
// (Same pattern already used for QR/barcode and manual entry — OCR does not
// need a different format, just noisier input.)
//
// OCR text for a full card looks like:
//   "HORMUUD UNIVERSITY STUDENT ID HU00004698 DEPARTMENT COMPUTER SCIENCE"
// This module extracts exactly one Student ID out of that, repairing only the
// specific OCR confusions (O/0, I/1, S/5, B/8, Z/2, G/6, Q/0) that the fixed
// letters-then-digits shape can justify — never a blind guess over free text.

export const STUDENT_ID_PATTERN = /^[A-Z]{2,4}\d{3,8}$/;
export const MIN_LETTERS = 2;
export const MAX_LETTERS = 4;
export const MIN_DIGITS = 3;
export const MAX_DIGITS = 8;

const MAX_TEXT_LENGTH = 4000;
// Tokens are split on anything that would never appear inside a real Student ID.
const WORD_SPLIT = /[\s,:;|_/\\]+/;
// Letters a misread digit could have come from, and vice versa — only applied
// inside the zone the schema says must be the other class, never elsewhere.
const LETTER_TO_DIGIT = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2', G: '6', Q: '0' };
// Characters OCR plausibly confuses with a letter or a digit, used only to find
// candidate tokens worth attempting a position-aware correction on.
const ALNUM_LOOSE = '0-9OoIiLlSsBbZzGgQqA-Za-z';

export const isValidStudentId = (value) => typeof value === 'string' && STUDENT_ID_PATTERN.test(value);

// Repairs a single token using the fixed "N letters then M digits" shape to
// decide which substitutions are safe: a letter-looking glyph found where
// digits must be is corrected to a digit, and a digit-looking glyph found
// where letters must be is corrected to a letter.
//
// Two guards keep this from ever being a blind guess:
//  1. A token with no real letter in it at all (e.g. a pure OCR misread of a
//     price or room number) is never "corrected" into having a letter
//     prefix — there is no positive evidence one exists.
//  2. Letter-prefix lengths are tried shortest first (2, then 3, then 4) and
//     the first split that produces a fully valid ID wins. This matches the
//     actual database, which only ever uses a 2-letter prefix (e.g. "HU") —
//     a longer split would only be reached if 2 genuinely cannot work, e.g.
//     a real 3/4-letter faculty prefix elsewhere in the system. Scoring by
//     raw edit distance was tried and rejected: an ambiguous glyph sitting
//     right after the real letters is always "free" to reinterpret as one
//     more letter rather than a digit, so minimal-edit-distance keeps
//     stretching the letter zone instead of fixing the digit zone — the
//     opposite of what the known format justifies.
// OCR-specific limits. The generic format above (2-4 letters) is what the
// database accepts, but OCR runs every ~2s on whatever the camera sees, so a
// permissive reading would turn background noise into believable-looking IDs.
// Card IDs always start with the university prefix, so OCR only accepts it.
export const OCR_PREFIX = 'HU';
export const OCR_MIN_DIGITS = 4;
export const OCR_MAX_DIGITS = 8;
// At most this many digit-zone glyphs may be "repaired" (O->0 etc.), and at
// least half the digit zone must already be real digits. A string of letters
// can therefore never be converted into a numeric ID.
const MAX_REPAIRS = 2;
// Glyphs OCR commonly produces for the 2nd letter of the prefix ("U").
const PREFIX_VARIANTS = { H: ['H'], U: ['U', 'V'] };

// Repairs one token into a Student ID, or returns null. Returns the repair
// count so callers can treat any repaired reading as "needs confirmation".
export const correctOcrTokenDetailed = (raw) => {
  if (typeof raw !== 'string') return null;
  const token = raw.trim().toUpperCase();
  const minLen = OCR_PREFIX.length + OCR_MIN_DIGITS;
  if (token.length < minLen || token.length > OCR_PREFIX.length + OCR_MAX_DIGITS) return null;

  const prefix = token.slice(0, OCR_PREFIX.length);
  const prefixOk = [...OCR_PREFIX].every((ch, i) => (PREFIX_VARIANTS[ch] || [ch]).includes(prefix[i]));
  if (!prefixOk) return null;

  const digitZone = token.slice(OCR_PREFIX.length);
  let repairs = prefix === OCR_PREFIX ? 0 : 1;
  let realDigits = 0;
  let fixed = '';
  for (const ch of digitZone) {
    if (/[0-9]/.test(ch)) { realDigits += 1; fixed += ch; } else if (LETTER_TO_DIGIT[ch]) { repairs += 1; fixed += LETTER_TO_DIGIT[ch]; } else return null;
  }
  if (repairs > MAX_REPAIRS || realDigits < Math.ceil(digitZone.length / 2)) return null;
  return { id: OCR_PREFIX + fixed, repairs };
};

export const correctOcrToken = (raw) => correctOcrTokenDetailed(raw)?.id ?? null;

// OCR sometimes inserts a space/hyphen where the printed card has none (e.g. a
// kerning gap after "HU"). Only join a letter-run and a digit-ish run that sit
// right next to each other with nothing else in between — this never merges
// unrelated words, it only undoes whitespace OCR itself introduced.
const joinSplitPairs = (text) => {
  const pairPattern = new RegExp(`(?<![${ALNUM_LOOSE}])([A-Za-z]{2,4})[\\s-]{1,2}([${ALNUM_LOOSE.slice(0, 10)}]{3,8})(?![${ALNUM_LOOSE}])`, 'g');
  const joined = [];
  let match = pairPattern.exec(text);
  while (match) {
    joined.push(match[1] + match[2]);
    match = pairPattern.exec(text);
  }
  return joined;
};

// Scans free OCR text (card branding, department name, etc. included) and
// returns every distinct Student ID it can justify extracting — not just the
// first one, so the caller can tell a clean single match from an ambiguous one.
const extractDetailed = (text) => {
  if (typeof text !== 'string') return new Map();
  const trimmed = text.trim();
  if (!trimmed) return new Map();
  const clipped = trimmed.length > MAX_TEXT_LENGTH ? trimmed.slice(0, MAX_TEXT_LENGTH) : trimmed;

  const attempts = [...clipped.split(WORD_SPLIT).filter(Boolean), ...joinSplitPairs(clipped)];
  const found = new Map(); // id -> fewest repairs any reading needed
  for (const token of attempts) {
    const hit = correctOcrTokenDetailed(token);
    if (hit && (!found.has(hit.id) || found.get(hit.id) > hit.repairs)) found.set(hit.id, hit.repairs);
  }
  return found;
};

// Scans free OCR text and returns every distinct Student ID it can justify.
export const extractIdCandidates = (text) => [...extractDetailed(text).keys()];

/**
 * @param {string} text Raw OCR text for one capture.
 * @param {{ confidence?: number, minConfidence?: number }} [opts]
 *   `confidence` is the OCR engine's 0-100 score for the capture (when available).
 * @returns {{
 *   ok: boolean,
 *   studentId: string|null,      // the one confirmed/auto-acceptable ID
 *   candidates: string[],        // every distinct ID the text could justify
 *   needsConfirmation: boolean,  // low confidence or more than one candidate
 *   reason: string,
 * }}
 */
// Below this engine score the capture is treated as "no card in view": the
// text is noise, so no ID is suggested at all (not even for confirmation).
export const NOISE_CONFIDENCE = 35;
// Auto-submit needs a clearly good read; anything between NOISE and this asks
// the invigilator to confirm instead.
export const AUTO_ACCEPT_CONFIDENCE = 70;

export const parseOcrText = (text, { confidence } = {}) => {
  const hasScore = typeof confidence === 'number';
  if (hasScore && confidence < NOISE_CONFIDENCE) {
    return { ok: false, studentId: null, candidates: [], needsConfirmation: false, reason: 'No clear Student ID in view. Hold the card flat inside the frame in good light.' };
  }

  const found = extractDetailed(text);
  const candidates = [...found.keys()];

  if (candidates.length === 0) {
    return { ok: false, studentId: null, candidates, needsConfirmation: false, reason: 'No Student ID found in the image. Reposition the card or enter the ID manually.' };
  }
  if (candidates.length > 1) {
    return { ok: false, studentId: candidates[0], candidates, needsConfirmation: true, reason: 'Found more than one possible Student ID — confirm which one is correct.' };
  }
  const [id] = candidates;
  if (found.get(id) > 0) {
    return { ok: false, studentId: id, candidates, needsConfirmation: true, reason: 'Some characters were unclear — check the Student ID against the card before submitting.' };
  }
  if (hasScore && confidence < AUTO_ACCEPT_CONFIDENCE) {
    return { ok: false, studentId: id, candidates, needsConfirmation: true, reason: 'Recognition confidence is low — confirm the Student ID before submitting.' };
  }
  return { ok: true, studentId: id, candidates, needsConfirmation: false, reason: '' };
};
