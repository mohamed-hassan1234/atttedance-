import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidStudentId,
  correctOcrToken,
  extractIdCandidates,
  parseOcrText,
} from '../src/utils/studentIdParser.js';

// ---- format validation ------------------------------------------------------

test('isValidStudentId accepts the real format (2-4 letters + 3-8 digits)', () => {
  assert.equal(isValidStudentId('HU2001'), true);
  assert.equal(isValidStudentId('HU00004698'), true);
  assert.equal(isValidStudentId('BUS3001'), true);
});

test('isValidStudentId rejects malformed input', () => {
  for (const bad of ['', 'HU', '1234', 'H1234', 'HU-1234', 'hu1234', null, undefined, 42]) {
    assert.equal(isValidStudentId(bad), false, String(bad));
  }
});

// ---- OCR confusion correction (position-aware, only within the right zone) -

test('repairs a few OCR confusions inside the digit zone only', () => {
  assert.equal(correctOcrToken('HU0OO04698'), 'HU00004698'); // two O's read where digits must be
  assert.equal(correctOcrToken('HU00004I98'), 'HU00004198'); // I read where a digit must be
  assert.equal(correctOcrToken('HV00004698'), 'HU00004698'); // "U" read as "V"
});

test('refuses heavily damaged tokens instead of guessing', () => {
  assert.equal(correctOcrToken('HUOOOO4698'), null); // 4 repairs: too many
  assert.equal(correctOcrToken('HUSOBIZG'), null); // all letters: cannot become digits
});

test('only the university prefix is accepted by OCR (no invented prefixes)', () => {
  assert.equal(correctOcrToken('H000004698'), null);
  assert.equal(correctOcrToken('BUS3001'), null);
  assert.equal(correctOcrToken('00004698'), null);
  assert.equal(correctOcrToken('12345678'), null);
});

test('background noise never becomes an ID', () => {
  for (const noise of ['ZOOSBSZG', 'SSSS5555', 'ILIL1111', 'UNIVERSITY', 'HORMUUD STUDENT', 'HI 5B8 O0', 'U1 H2']) {
    assert.deepEqual(extractIdCandidates(noise), [], noise);
  }
});

test('leaves an already-valid token unchanged', () => {
  assert.equal(correctOcrToken('HU2001'), 'HU2001');
});

test('returns null when no position-aware correction yields a valid ID', () => {
  assert.equal(correctOcrToken('????'), null);
  assert.equal(correctOcrToken('TOOLONGTOEVERBEANIDATALL123456789'), null);
  assert.equal(correctOcrToken(''), null);
  assert.equal(correctOcrToken(null), null);
});

// ---- extracting a Student ID out of noisy OCR text -------------------------

test('extracts the Student ID out of full card text with branding and other fields', () => {
  const text = 'HORMUUD UNIVERSITY STUDENT ID HU00004698 DEPARTMENT COMPUTER SCIENCE';
  assert.deepEqual(extractIdCandidates(text), ['HU00004698']);
});

test('is case-insensitive', () => {
  assert.deepEqual(extractIdCandidates('student id hu00004698 faculty'), ['HU00004698']);
});

test('tolerates an OCR-introduced space inside the ID', () => {
  assert.deepEqual(extractIdCandidates('HU 00004698'), ['HU00004698']);
  assert.deepEqual(extractIdCandidates('HU-00004698'), ['HU00004698']);
});

test('repairs OCR noise characters inside an otherwise-matching token', () => {
  assert.deepEqual(extractIdCandidates('ID: HU0OO04698 CS DEPT'), ['HU00004698']);
});

test('finds nothing in text with no plausible Student ID', () => {
  assert.deepEqual(extractIdCandidates('HORMUUD UNIVERSITY OFFICIAL STUDENT CARD'), []);
  assert.deepEqual(extractIdCandidates(''), []);
  assert.deepEqual(extractIdCandidates(null), []);
});

test('reports every distinct candidate when text contains more than one plausible ID', () => {
  const candidates = extractIdCandidates('HU2001 or maybe HU2002');
  assert.equal(candidates.length, 2);
  assert.ok(candidates.includes('HU2001'));
  assert.ok(candidates.includes('HU2002'));
});

// ---- parseOcrText: the decision layer (auto-accept vs. needs confirmation) -

test('a single high-confidence candidate is auto-accepted', () => {
  const result = parseOcrText('STUDENT ID HU00004698', { confidence: 92 });
  assert.deepEqual(result, { ok: true, studentId: 'HU00004698', candidates: ['HU00004698'], needsConfirmation: false, reason: '' });
});

test('a single low-confidence candidate requires confirmation instead of auto-submitting', () => {
  const result = parseOcrText('STUDENT ID HU00004698', { confidence: 40 });
  assert.equal(result.ok, false);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.studentId, 'HU00004698'); // offered as the suggestion, not submitted
});

test('an ambiguous capture (two candidates) always requires confirmation, regardless of confidence', () => {
  const result = parseOcrText('HU2001 HU2002', { confidence: 95 });
  assert.equal(result.ok, false);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.candidates.length, 2);
});

test('no candidate found is reported as not-ok without asking for confirmation of nothing', () => {
  const result = parseOcrText('HORMUUD UNIVERSITY');
  assert.deepEqual(result, {
    ok: false,
    studentId: null,
    candidates: [],
    needsConfirmation: false,
    reason: 'No Student ID found in the image. Reposition the card or enter the ID manually.',
  });
});

test('a syntactically valid ID that does not exist is not this module\'s concern — it only validates format', () => {
  // HU9999999 is well-formed; whether it exists is a server lookup (404), not a parsing decision.
  const result = parseOcrText('STUDENT ID HU9999999', { confidence: 90 });
  assert.equal(result.ok, true);
  assert.equal(result.studentId, 'HU9999999');
});

test('missing confidence (e.g. a photo-upload path with no engine score) does not block a clean single match', () => {
  const result = parseOcrText('STUDENT ID HU2001');
  assert.equal(result.ok, true);
  assert.equal(result.studentId, 'HU2001');
});

test('a very low-confidence capture (no card in view) yields no ID at all', () => {
  const result = parseOcrText('HU00004698', { confidence: 20 });
  assert.equal(result.ok, false);
  assert.equal(result.studentId, null);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.needsConfirmation, false);
});

test('a repaired reading is never auto-accepted, even at high confidence', () => {
  const result = parseOcrText('STUDENT ID HU0OO04698', { confidence: 95 });
  assert.equal(result.ok, false);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.studentId, 'HU00004698');
});
