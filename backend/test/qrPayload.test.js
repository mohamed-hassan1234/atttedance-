const test = require('node:test');
const assert = require('node:assert/strict');
const { extractStudentId, extractQrToken } = require('../src/utils/qrPayload');

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('extracts a bare Student ID like HU1234, trimmed and upper-cased', () => {
  assert.equal(extractStudentId('HU1234'), 'HU1234');
  assert.equal(extractStudentId('  hu1234\n'), 'HU1234');
});

test('reads only the Student ID from JSON or from longer card text', () => {
  assert.equal(extractStudentId('{"studentId":"hu1234","eligible":true}'), 'HU1234');
  assert.equal(extractStudentId('Name: Ahmed Ali\nID: HU1234\nFaculty: Science'), 'HU1234');
});

test('rejects payloads without exactly one valid Student ID, without throwing', () => {
  const bad = [
    '', '   ', 'hello', 'HU', '1234', 'HU12', 'H1234', 'HU-1234', 'HU1234X',
    'HU1234 HU5678', '{oops', '{"id":"HU1234"}', '{"studentId":"HU-1234"}', TOKEN,
    JSON.stringify({ type: 'student_verification', token: TOKEN }),
    { $ne: null }, null, undefined, 42, 'x'.repeat(5000),
  ];
  for (const value of bad) {
    assert.equal(extractStudentId(value), '', `should reject ${String(JSON.stringify(value)).slice(0, 30)}`);
  }
});

test('legacy token payloads still parse for previously queued offline scans', () => {
  assert.equal(extractQrToken(JSON.stringify({ type: 'student_verification', token: TOKEN })), TOKEN);
  assert.equal(extractQrToken('{"studentId":"STU-1"}'), '');
});
