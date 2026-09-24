const test = require('node:test');
const assert = require('node:assert/strict');
const { scanStudentQr } = require('../src/controllers/qrController');
const { syncOfflineRecords } = require('../src/controllers/attendanceController');
const { authorize } = require('../src/middleware/roleCheck');
const { setup, mockReq, mockRes, makeStudent, makeExam, TOKEN } = require('./helpers');

const rethrow = (e) => { throw e; };
const scan = async (body) => {
  const res = mockRes();
  await scanStudentQr(mockReq(body), res, rethrow);
  return res;
};
const sync = async (records) => {
  const res = mockRes();
  await syncOfflineRecords(mockReq({ records }), res, rethrow);
  return res;
};

const payload = JSON.stringify({ type: 'student_verification', token: TOKEN });
const EXAM = makeExam()._id;

test('valid QR + eligible exam records attendance', async () => {
  const { db, restore } = setup();
  try {
    const res = await scan({ qrData: payload, examId: EXAM });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.attendanceStatus, 'Eligible');
    assert.equal(res.body.student.studentId, 'CS-2001');
    assert.equal(db.attendance.length, 1);
    assert.equal(db.attendance[0].recordedOffline, false);
  } finally { restore(); }
});

test('invalid QR is rejected and audited, no attendance', async () => {
  const { db, restore } = setup();
  try {
    const res = await scan({ qrData: '{"studentId":"CS-2001","eligible":true}', examId: EXAM });
    assert.equal(res.statusCode, 400);
    assert.equal(db.attendance.length, 0);
    assert.equal(db.scans[0].scanStatus, 'Invalid QR');
  } finally { restore(); }
});

test('unknown token returns 404', async () => {
  const { db, restore } = setup({ students: [] });
  try {
    const res = await scan({ qrData: payload, examId: EXAM });
    assert.equal(res.statusCode, 404);
    assert.equal(db.attendance.length, 0);
  } finally { restore(); }
});

test('deactivated QR returns 410', async () => {
  const { restore } = setup({ students: [makeStudent({ qrStatus: 'inactive' })] });
  try {
    assert.equal((await scan({ qrData: payload, examId: EXAM })).statusCode, 410);
  } finally { restore(); }
});

[
  ['wrong faculty', { faculty: 'Business' }, 'faculty'],
  ['wrong department', { department: 'Networks' }, 'department'],
  ['fee not cleared', { feeStatus: 'Not Cleared' }, 'finance'],
].forEach(([name, studentOver, reasonPart]) => {
  test(`${name} is recorded as Not Eligible with the server's reason`, async () => {
    const { db, restore } = setup({ students: [makeStudent(studentOver)] });
    try {
      const res = await scan({ qrData: payload, examId: EXAM });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.attendanceStatus, 'Not Eligible');
      assert.match(res.body.attendance.eligibilityReason.toLowerCase(), new RegExp(reasonPart));
      assert.equal(db.attendance.length, 1, 'audit record still written');
    } finally { restore(); }
  });
});

test('second scan of the same student is a 409 and creates no second record', async () => {
  const { db, restore } = setup();
  try {
    await scan({ qrData: payload, examId: EXAM });
    const res = await scan({ qrData: payload, examId: EXAM });
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.attendanceStatus, 'Duplicate');
    assert.equal(db.attendance.length, 1);
  } finally { restore(); }
});

test('invigilator not assigned to the exam gets 403 and nothing is recorded', async () => {
  const { db, restore } = setup({ exams: [makeExam({ assignedInvigilators: ['someone-else'] })] });
  try {
    const res = await scan({ qrData: payload, examId: EXAM });
    assert.equal(res.statusCode, 403);
    assert.equal(db.attendance.length, 0);
  } finally { restore(); }
});

test('malformed examId is rejected before any lookup', async () => {
  const { restore } = setup();
  try {
    assert.equal((await scan({ qrData: payload, examId: { $ne: null } })).statusCode, 400);
    assert.equal((await scan({ qrData: payload, examId: 'nope' })).statusCode, 400);
  } finally { restore(); }
});

test('authorize("invigilator") blocks anonymous and admin users', () => {
  const run = (user) => {
    const res = mockRes();
    let called = false;
    authorize('invigilator')({ user }, res, () => { called = true; });
    return { called, res };
  };
  assert.equal(run(undefined).res.statusCode, 403);
  assert.equal(run({ role: 'admin' }).res.statusCode, 403);
  assert.equal(run({ role: 'invigilator' }).called, true);
});

test('the /qr/scan route is protected and invigilator-only', () => {
  const router = require('../src/routes/qrRoutes');
  const layer = router.stack.find((l) => l.route && l.route.path === '/scan');
  assert.ok(layer, '/scan route exists');
  assert.equal(layer.route.stack.length, 2, 'authorize + handler');
  const protectApplied = router.stack.some((l) => !l.route && l.name === 'protect');
  assert.ok(protectApplied, 'protect middleware runs before routes');
});

test('offline QR item is re-validated on sync (eligibility recomputed server-side)', async () => {
  const { db, restore } = setup({ students: [makeStudent({ feeStatus: 'Not Cleared' })] });
  try {
    const res = await sync([
      { clientId: 'c1', qrToken: payload, examId: EXAM, timeStamp: new Date().toISOString(), eligible: true },
      { clientId: 'c2', qrToken: 'garbage', examId: EXAM },
    ]);
    const [ok, bad] = res.body.data;
    assert.equal(ok.status, 'Synced');
    assert.equal(ok.clientId, 'c1');
    assert.equal(db.attendance[0].eligibilityStatus, 'Not Eligible');
    assert.equal(db.attendance[0].recordedOffline, true);
    assert.equal(bad.status, 'Failed');
  } finally { restore(); }
});

test('syncing the same queued scan twice does not duplicate attendance', async () => {
  const { db, restore } = setup();
  try {
    const item = { clientId: 'c1', qrToken: payload, examId: EXAM };
    for (let i = 0; i < 2; i += 1) {
      const res = await sync([item]);
      assert.equal(res.body.data[0].status, 'Synced');
    }
    assert.equal(db.attendance.length, 1);
  } finally { restore(); }
});

test('sync item for an unknown student fails cleanly', async () => {
  const { restore } = setup();
  try {
    const res = await sync([{ clientId: 'c1', studentId: 'NOPE-1', examId: EXAM }]);
    assert.equal(res.body.data[0].status, 'Failed');
  } finally { restore(); }
});
