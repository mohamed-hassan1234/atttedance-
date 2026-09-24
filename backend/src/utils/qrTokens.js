const crypto = require('crypto');
const StudentQrToken = require('../models/StudentQrToken');
const Student = require('../models/Student');

const generateRawToken = () => crypto.randomBytes(32).toString('hex');

const generateUniqueQrToken = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateRawToken();
    const existing = await StudentQrToken.exists({ token });
    if (!existing) return token;
  }
  throw new Error('Could not generate a unique QR token');
};

const assignStudentQrToken = async (student, { replace = false } = {}) => {
  if (replace && student.qrToken) {
    await StudentQrToken.updateMany(
      { student: student._id, status: 'active' },
      { status: 'inactive', deactivatedAt: new Date() }
    );
  }

  const token = await generateUniqueQrToken();
  const generatedAt = new Date();

  student.qrToken = token;
  student.qrStatus = 'active';
  student.qrGeneratedAt = generatedAt;
  await student.save();

  await StudentQrToken.create({
    student: student._id,
    token,
    status: 'active',
    generatedAt,
  });

  return student;
};

// Resolves a QR token to its student. Returns { student, status } where status is
// 'ok' | 'unknown' | 'deactivated'. `student` is set whenever one could be found.
const findStudentByQrToken = async (token) => {
  const qrToken = await StudentQrToken.findOne({ token }).populate({ path: 'student', select: '+qrToken' });
  if (!qrToken) return { student: null, status: 'unknown' };

  const student = qrToken.student || await Student.findOne({ qrToken: token }).select('+qrToken');
  if (!student) return { student: null, status: 'unknown' };

  const active = qrToken.status === 'active' && student.qrStatus === 'active' && student.qrToken === token;
  return { student, status: active ? 'ok' : 'deactivated' };
};

module.exports = { assignStudentQrToken, findStudentByQrToken };
