import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentQr } from '../src/utils/parseStudentQr.js';
import { createScanCoordinator } from '../src/services/scanCoordinator.js';
import { createCameraSession, explainCameraError } from '../src/services/cameraSession.js';

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

// ---- QR payload parsing ----------------------------------------------------

test('parses the SEAMS JSON payload to its token', () => {
  const parsed = parseStudentQr(JSON.stringify({ type: 'student_verification', token: TOKEN }));
  assert.deepEqual(parsed, { ok: true, token: TOKEN });
});

test('accepts URL and bare-token payloads, trimming whitespace', () => {
  assert.equal(parseStudentQr(`  ${TOKEN} `).token, TOKEN);
  assert.equal(parseStudentQr(`https://seams.example/verify-student/${TOKEN}`).token, TOKEN);
});

test('ignores injected fields (eligible flag) — only the token is read', () => {
  const parsed = parseStudentQr(JSON.stringify({ type: 'student_verification', token: TOKEN, eligible: true }));
  assert.deepEqual(parsed, { ok: true, token: TOKEN });
});

test('rejects invalid payloads with a predictable error and never throws', () => {
  for (const bad of ['', '  ', 'hello', '{oops', '{"studentId":"CS-1"}', null, undefined, 7, {}, 'x'.repeat(3000)]) {
    assert.deepEqual(parseStudentQr(bad), { ok: false, error: 'Invalid student QR code.' });
  }
});

// ---- repeated detections ---------------------------------------------------

test('20 detections of the same QR trigger exactly one request', async () => {
  let calls = 0;
  const coordinator = createScanCoordinator({ submit: async () => { calls += 1; } });
  const accepted = Array.from({ length: 20 }, () => coordinator.handleDetection('QR-A')).filter(Boolean);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(accepted.length, 1);
  assert.equal(calls, 1);
});

test('a different QR is still ignored while the first is processing, then accepted after release', async () => {
  let calls = 0;
  let clock = 0;
  const coordinator = createScanCoordinator({ submit: async () => { calls += 1; }, now: () => clock, cooldownMs: 3000 });
  assert.equal(coordinator.handleDetection('QR-A'), true);
  assert.equal(coordinator.handleDetection('QR-B'), false, 'locked while processing');
  coordinator.release();
  assert.equal(coordinator.handleDetection('QR-A'), false, 'same QR still in view right after release');
  assert.equal(coordinator.handleDetection('QR-B'), true, 'next student is accepted immediately');
  clock += 5000;
  coordinator.release();
  assert.equal(coordinator.handleDetection('QR-A'), true, 'same QR accepted after cooldown');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls, 3);
});

test('a failing submit does not leave an unhandled rejection or crash the coordinator', async () => {
  const coordinator = createScanCoordinator({ submit: async () => { throw new Error('boom'); } });
  assert.equal(coordinator.handleDetection('QR-A'), true);
  await new Promise((r) => setTimeout(r, 5));
});

// ---- camera lifecycle ------------------------------------------------------

const makeFakeCamera = () => {
  const stats = { active: 0, maxActive: 0, started: 0, stopped: 0, cleared: 0, released: 0 };
  const createScanner = () => {
    const scanner = {
      isScanning: false,
      async start(_cfg, _scan, onDecode) {
        await new Promise((r) => setTimeout(r, 5));
        scanner.isScanning = true;
        scanner.onDecode = onDecode;
        stats.started += 1;
        stats.active += 1;
        stats.maxActive = Math.max(stats.maxActive, stats.active);
      },
      async stop() { scanner.isScanning = false; stats.stopped += 1; stats.active -= 1; },
      clear() { stats.cleared += 1; },
    };
    return scanner;
  };
  return { stats, createScanner, releaseStreams: () => { stats.released += 1; } };
};

test('camera is released when the session is stopped (unmount)', async () => {
  const cam = makeFakeCamera();
  const session = createCameraSession(cam);
  await session.start({ facingMode: 'environment' }, {}, () => {});
  assert.equal(cam.stats.active, 1);
  await session.stop();
  assert.equal(cam.stats.active, 0);
  assert.ok(cam.stats.released > 0, 'MediaStream tracks explicitly released');
  assert.equal(session.getScanner(), null);
});

test('React StrictMode start -> stop -> start never opens two cameras and ends with one', async () => {
  const cam = makeFakeCamera();
  const session = createCameraSession(cam);
  const first = session.start({}, {}, () => {});
  session.stop();
  const second = session.start({}, {}, () => {});
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.started, false, 'superseded start is abandoned');
  assert.equal(b.started, true);
  assert.equal(cam.stats.maxActive, 1);
  assert.equal(cam.stats.active, 1);
  await session.stop();
  assert.equal(cam.stats.active, 0);
});

test('unmount while the camera is still starting leaves nothing running', async () => {
  const cam = makeFakeCamera();
  const session = createCameraSession(cam);
  const pending = session.start({}, {}, () => {});
  const stopped = session.stop();
  await Promise.all([pending, stopped]);
  assert.equal(cam.stats.active, 0);
});

test('decodes after stop are ignored', async () => {
  const cam = makeFakeCamera();
  const session = createCameraSession(cam);
  const seen = [];
  const { scanner } = await session.start({}, {}, (t) => seen.push(t));
  scanner.onDecode('one');
  await session.stop();
  scanner.onDecode('late');
  assert.deepEqual(seen, ['one']);
});

test('a failed start cleans up and surfaces the error', async () => {
  const cam = makeFakeCamera();
  const session = createCameraSession({
    ...cam,
    createScanner: () => ({ isScanning: false, start: async () => { throw new Error('NotAllowedError: denied'); }, stop: async () => {}, clear() {} }),
  });
  await assert.rejects(session.start({}, {}, () => {}), /denied/);
  assert.equal(session.getScanner(), null);
});

// ---- camera error messages -------------------------------------------------

test('camera errors map to actionable codes', () => {
  assert.equal(explainCameraError({ name: 'NotAllowedError' }).code, 'permission-denied');
  assert.equal(explainCameraError('Permission denied').code, 'permission-denied');
  assert.equal(explainCameraError({ name: 'NotFoundError' }).code, 'no-camera');
  assert.equal(explainCameraError({ name: 'NotReadableError' }).code, 'camera-in-use');
  assert.equal(explainCameraError('anything', { isSecureContext: false }).code, 'insecure-context');
  assert.equal(explainCameraError(new Error('weird')).code, 'unknown');
});
