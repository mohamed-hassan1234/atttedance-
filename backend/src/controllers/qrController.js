const mongoose = require('mongoose');
const QrScanRecord = require('../models/QrScanRecord');
const Student = require('../models/Student');
const Examination = require('../models/Examination');
const { extractQrToken } = require('../utils/qrPayload');
const { findStudentByQrToken } = require('../utils/qrTokens');
const { processAttendanceAttempt, canRecordForExam } = require('../services/attendanceService');
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

// @desc  Validate a student QR code, save an audit record and, when an examId is
//        supplied, record attendance through the same service as manual entry.
// @route POST /api/qr/scan
// @body  { qrData | token, examId?, deviceInfo? }
// @access Invigilator
// Without examId this stays the legacy "verify only" call. The QR contributes only
// an opaque token; the student, eligibility and authorization all come from the DB.
const scanStudentQr = async (req, res, next) => {
  try {
    const token = extractQrToken(req.body.qrData || req.body.token);
    const { examId } = req.body;

    if (!token) {
      await createScanRecord({ req, token, status: 'Invalid QR' });
      return res.status(400).json({ success: false, message: 'Invalid student QR code.', scanStatus: 'Invalid QR' });
    }

    if (examId !== undefined && !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({ success: false, message: 'A valid examId is required.' });
    }

    if (!examId) {
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
    }

    const { student, status } = await findStudentByQrToken(token);
    if (!student) {
      const record = await createScanRecord({ req, token, status: 'Invalid QR' });
      return res.status(404).json({ success: false, message: 'Student not found for this QR code.', scanStatus: 'Invalid QR', data: record });
    }

    if (status !== 'ok') {
      const record = await createScanRecord({ req, token, student, status: 'QR deactivated' });
      return res.status(410).json({
        success: false,
        message: 'This QR code has been deactivated. Ask the Admin for the current QR code.',
        scanStatus: 'QR deactivated',
        data: record,
        student: publicStudent(student),
      });
    }

    if (!examId) {
      const record = await createScanRecord({ req, token, student, status: 'Successful' });
      return res.status(200).json({
        success: true,
        message: 'Valid student QR code',
        scanStatus: 'Successful',
        data: record,
        student: publicStudent(student),
      });
    }

    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.', scanStatus: 'Exam not found' });
    }
    if (!canRecordForExam(exam, req.user)) {
      await createScanRecord({ req, token, student, status: 'Access denied' });
      console.warn(`QR attendance denied: user ${req.user._id} is not assigned to exam ${exam._id}`);
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this examination.',
        scanStatus: 'Access denied',
      });
    }

    const { outcome, record: attendance } = await processAttendanceAttempt({
      student,
      exam,
      invigilator: req.user,
      logMessage: 'Recorded via QR scan',
    });

    const examSummary = { _id: exam._id, examName: exam.examName, courseCode: exam.courseCode };
    const attendanceSummary = attendance && {
      _id: attendance._id,
      eligibilityStatus: attendance.eligibilityStatus,
      eligibilityReason: attendance.eligibilityReason,
      timeStamp: attendance.timeStamp,
      recordedOffline: attendance.recordedOffline,
    };

    if (outcome === 'duplicate') {
      await createScanRecord({ req, token, student, status: 'Duplicate scan' });
      return res.status(409).json({
        success: false,
        message: 'Attendance has already been recorded for this student.',
        scanStatus: 'Duplicate scan',
        attendanceStatus: 'Duplicate',
        student: publicStudent(student),
        exam: examSummary,
        attendance: attendanceSummary,
      });
    }

    await createScanRecord({ req, token, student, status: 'Successful' });
    if (attendance.eligibilityStatus === 'Not Eligible') {
      console.warn(`QR attendance rejected: student ${student._id}, exam ${exam._id}: ${attendance.eligibilityReason}`);
    }

    res.status(200).json({
      success: true,
      message: attendance.eligibilityStatus === 'Eligible' ? 'Attendance recorded' : 'Student is not eligible for this exam.',
      scanStatus: 'Successful',
      attendanceStatus: attendance.eligibilityStatus,
      student: publicStudent(student),
      exam: examSummary,
      attendance: attendanceSummary,
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
