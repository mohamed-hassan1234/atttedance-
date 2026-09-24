const test = require('node:test');
const assert = require('node:assert/strict');
const { extractQrToken } = require('../src/utils/qrPayload');

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('extracts token from the current JSON payload', () => {
  assert.equal(extractQrToken(JSON.stringify({ type: 'student_verification', token: TOKEN })), TOKEN);
});

test('extracts token from bare, padded, and URL forms', () => {
  assert.equal(extractQrToken(`  ${TOKEN}\n`), TOKEN);
  assert.equal(extractQrToken(`https://seams.example/verify-student/${TOKEN}?x=1`), TOKEN);
});

test('ignores extra fields such as an injected eligibility flag', () => {
  const raw = JSON.stringify({ type: 'student_verification', token: TOKEN, eligible: true, studentId: 'X' });
  assert.equal(extractQrToken(raw), TOKEN);
});

test('rejects unusable payloads without throwing', () => {
  const bad = [
    '', '   ', 'short', '{not json', '{"studentId":"STU-1"}',
    `{"type":"other","token":"${TOKEN}"}`,
    { $ne: null }, null, undefined, 42, 'x'.repeat(5000), `${TOKEN}<script>`,
  ];
  for (const value of bad) {
    assert.equal(extractQrToken(value), '', `should reject ${String(JSON.stringify(value)).slice(0, 30)}`);
  }
});
