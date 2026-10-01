// In-memory stand-ins for the Mongoose models so controller logic can be tested
// without a database. Patches static methods on the real model objects.
const AttendanceRecord = require('../src/models/AttendanceRecord');
const SyncLog = require('../src/models/SyncLog');
const Student = require('../src/models/Student');
const Examination = require('../src/models/Examination');
const StudentQrToken = require('../src/models/StudentQrToken');
const QrScanRecord = require('../src/models/QrScanRecord');

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

const thenable = (value) => ({
  populate: () => thenable(value),
  select: () => thenable(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const makeStudent = (over = {}) => ({
  _id: 's1',
  studentId: 'HU1234',
  fullName: 'Ahmed Mohamed',
  faculty: 'Computer Science',
  department: 'Software',
  feeStatus: 'Cleared',
  absenceCount: 0,
  qrToken: TOKEN,
  qrStatus: 'active',
  ...over,
});

const makeExam = (over = {}) => ({
  _id: '64b7f0f0f0f0f0f0f0f0f0f1',
  examName: 'Algorithms',
  courseCode: 'CS101',
  faculty: 'Computer Science',
  department: 'Software',
  assignedInvigilators: ['inv1'],
  ...over,
});

const setup = ({ students = [makeStudent()], exams = [makeExam()] } = {}) => {
  const db = { attendance: [], scans: [], logs: [], students, exams };
  const tokenDocs = students.map((s) => ({
    token: s.qrToken,
    status: s.qrStatus === 'active' ? 'active' : 'inactive',
    student: s,
  }));
  const originals = [];
  const patch = (model, key, fn) => {
    originals.push([model, key, model[key]]);
    model[key] = fn;
  };

  patch(StudentQrToken, 'findOne', ({ token }) => thenable(tokenDocs.find((t) => t.token === token) || null));
  patch(Student, 'findOne', (q) => thenable(
    db.students.find((s) => (q.studentId ? s.studentId === q.studentId : s.qrToken === q.qrToken)) || null
  ));
  patch(Examination, 'findById', async (id) => db.exams.find((e) => String(e._id) === String(id)) || null);
  patch(AttendanceRecord, 'findOne', async (q) => (
    db.attendance.find((a) => a.student === q.student && String(a.exam) === String(q.exam)) || null
  ));
  patch(AttendanceRecord, 'create', async (doc) => {
    const rec = { _id: `a${db.attendance.length + 1}`, ...doc, save: async () => rec };
    db.attendance.push(rec);
    return rec;
  });
  patch(SyncLog, 'create', async (d) => { db.logs.push(d); return d; });
  patch(QrScanRecord, 'create', async (d) => { db.scans.push(d); return d; });
  patch(QrScanRecord, 'findOne', () => thenable(null));

  const restore = () => originals.forEach(([model, key, fn]) => { model[key] = fn; });
  return { db, restore };
};

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const mockReq = (body, user = { _id: 'inv1', role: 'invigilator', fullName: 'Inv One' }) => (
  { body, user, headers: {}, ip: '127.0.0.1' }
);

module.exports = { setup, mockReq, mockRes, makeStudent, makeExam, TOKEN };
