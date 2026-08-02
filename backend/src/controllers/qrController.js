const QrScanRecord = require('../models/QrScanRecord');
const Student = require('../models/Student');
const StudentQrToken = require('../models/StudentQrToken');
const { checkStudentStanding } = require('../utils/eligibility');

const RECENT_DUPLICATE_MS = 8000;

const publicStudent = (student) => {
  const { blocked, reason } = checkStudentStanding(student);
  return {
    _id: student._id,
    studentId: student.studentId,
    fullName: student.fullName,
    faculty: student.faculty,
    department: student.department,
    className: student.className,
    feeStatus: student.feeStatus,
    absenceCount: student.absenceCount,
    photoUrl: student.photoUrl,
    email: student.email,
    qrStatus: student.qrStatus,
    qrGeneratedAt: student.qrGeneratedAt,
    blocked,
    blockReason: reason,
  };
};

const extractQrToken = (qrData) => {
  if (!qrData || typeof qrData !== 'string') return '';
  const trimmed = qrData.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.type === 'student_verification' && parsed?.token) {
      return String(parsed.token).trim();
    }
  } catch {
    // Not JSON; fall through to URL/plain-token parsing.
  }

  try {
    const url = new URL(trimmed);
    const token = url.pathname.split('/').filter(Boolean).pop();
    return token || '';
  } catch {
    if (trimmed.includes('/verify-student/')) {
      return trimmed.split('/verify-student/').pop().split(/[?#]/)[0];
    }
    return trimmed;
  }
};

const createScanRecord = async ({ req, token, student, status }) => {
  return QrScanRecord.create({
    student: student?._id,
    studentIdSnapshot: student?.studentId || '',
    invigilator: req.user._id,
    invigilatorNameSnapshot: req.user.fullName,
    qrTokenReference: token || 'unreadable',
    scanStatus: status,
    scannedAt: new Date(),
    deviceInfo: req.body.deviceInfo || req.headers['user-agent'] || '',
    ipAddress: req.ip || req.socket?.remoteAddress || '',
  });
};

// @desc  Validate a student QR code and save an audit record
// @route POST /api/qr/scan
// @access Invigilator
const scanStudentQr = async (req, res, next) => {
  try {
    const token = extractQrToken(req.body.qrData || req.body.token);

    if (!token || token.length < 16) {
      await createScanRecord({ req, token, status: 'Invalid QR' });
      return res.status(400).json({ success: false, message: 'Invalid QR code' });
    }

    const recentDuplicate = await QrScanRecord.findOne({
      invigilator: req.user._id,
      qrTokenReference: token,
      scannedAt: { $gte: new Date(Date.now() - RECENT_DUPLICATE_MS) },
    }).populate('student');

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'This student was already scanned recently.',
        scanStatus: 'Duplicate scan',
        data: recentDuplicate,
        student: recentDuplicate.student ? publicStudent(recentDuplicate.student) : null,
      });
    }

    const qrToken = await StudentQrToken.findOne({ token }).populate({ path: 'student', select: '+qrToken' });
    if (!qrToken) {
      const record = await createScanRecord({ req, token, status: 'Invalid QR' });
      return res.status(404).json({ success: false, message: 'QR code not found or not recognised.', data: record });
    }

    const student = qrToken.student || await Student.findOne({ qrToken: token }).select('+qrToken');
    if (!student) {
      const record = await createScanRecord({ req, token, status: 'Invalid QR' });
      return res.status(404).json({ success: false, message: 'Student not found for this QR code.', data: record });
    }

    if (qrToken.status !== 'active' || student.qrStatus !== 'active' || student.qrToken !== token) {
      const record = await createScanRecord({ req, token, student, status: 'QR deactivated' });
      return res.status(410).json({
        success: false,
        message: 'This QR code has been deactivated. Ask the Admin for the current QR code.',
        scanStatus: 'QR deactivated',
        data: record,
        student: publicStudent(student),
      });
    }

    const record = await createScanRecord({ req, token, student, status: 'Successful' });

    res.status(200).json({
      success: true,
      message: 'Valid student QR code',
      scanStatus: 'Successful',
      data: record,
      student: publicStudent(student),
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get QR scan records. Admin sees all; Invigilators see their own.
// @route GET /api/qr/scans
// @access Admin, Invigilator
const getQrScans = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'invigilator') filter.invigilator = req.user._id;
    if (req.query.invigilator && req.user.role === 'admin') filter.invigilator = req.query.invigilator;
    if (req.query.scanStatus) filter.scanStatus = req.query.scanStatus;
    if (req.query.studentId) filter.studentIdSnapshot = new RegExp(req.query.studentId.trim(), 'i');
    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.scannedAt = { $gte: start, $lt: end };
    }

    const records = await QrScanRecord.find(filter)
      .populate('student')
      .populate('invigilator', 'fullName username invigilatorId')
      .sort({ scannedAt: -1 })
      .limit(Number(req.query.limit) || 200);

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

module.exports = { scanStudentQr, getQrScans };
