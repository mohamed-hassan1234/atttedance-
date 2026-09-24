const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const SyncLog = require('../models/SyncLog');
const Student = require('../models/Student');
const Examination = require('../models/Examination');
const { checkEligibility } = require('../utils/eligibility');
const { extractQrToken } = require('../utils/qrPayload');
const { findStudentByQrToken } = require('../utils/qrTokens');
const { processAttendanceAttempt, canRecordForExam } = require('../services/attendanceService');

// @desc  Record attendance for a student in an exam (online path)
// @route POST /api/attendance
// @body  { studentId, examId }
const recordAttendance = async (req, res, next) => {
  try {
    const { studentId, examId } = req.body;

    if (typeof studentId !== 'string' || !studentId.trim()) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }
    if (!mongoose.isValidObjectId(examId)) {
      return res.status(400).json({ success: false, message: 'A valid examId is required' });
    }

    const student = await Student.findOne({ studentId: studentId.trim().toUpperCase() });
    if (!student) {
      return res.status(404).json({ success: false, message: `No student found with ID ${studentId}` });
    }

    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }
    if (!canRecordForExam(exam, req.user)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this examination.' });
    }

    const { outcome, record } = await processAttendanceAttempt({ student, exam, invigilator: req.user });
    if (outcome === 'duplicate') {
      return res.status(409).json({
        success: false,
        message: `${student.fullName} (${student.studentId}) has already been marked present for this examination`,
        data: record,
      });
    }

    const populated = await record.populate([
      { path: 'student' },
      { path: 'exam' },
      { path: 'invigilator', select: 'fullName username' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// Resolves a queued offline item to a student. Items carry either a studentId
// (manual entry) or the raw QR payload/token (QR scan made while offline).
const resolveSyncStudent = async (item) => {
  if (typeof item.qrToken === 'string') {
    const token = extractQrToken(item.qrToken);
    if (!token) return { error: 'Invalid QR code' };
    const { student, status } = await findStudentByQrToken(token);
    if (!student) return { error: 'QR code not recognised' };
    if (status !== 'ok') return { error: 'QR code has been deactivated' };
    return { student };
  }
  if (typeof item.studentId === 'string' && item.studentId.trim()) {
    const student = await Student.findOne({ studentId: item.studentId.trim().toUpperCase() });
    return student ? { student } : { error: 'Student not found' };
  }
  return { error: 'Missing student identifier' };
};

// @desc  Bulk-sync attendance records captured while offline on the invigilator's device
// @route POST /api/attendance/sync
// @body  { records: [{ clientId?, studentId | qrToken, examId, timeStamp }] }
// Eligibility is always recomputed here; nothing decided offline is trusted.
const syncOfflineRecords = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No offline records provided to sync' });
    }

    const results = [];

    for (const item of records) {
      const echo = { clientId: item?.clientId, studentId: item?.studentId };
      try {
        if (!item || !mongoose.isValidObjectId(item.examId)) {
          results.push({ ...echo, status: 'Failed', reason: 'Student or exam not found' });
          continue;
        }

        const { student, error } = await resolveSyncStudent(item);
        const exam = await Examination.findById(item.examId);

        if (!student || !exam) {
          results.push({ ...echo, status: 'Failed', reason: error || 'Student or exam not found' });
          continue;
        }
        echo.studentId = student.studentId;

        if (!canRecordForExam(exam, req.user)) {
          results.push({ ...echo, status: 'Failed', reason: 'Not assigned to this examination' });
          continue;
        }

        const timeStamp = item.timeStamp && !Number.isNaN(Date.parse(item.timeStamp)) ? new Date(item.timeStamp) : new Date();
        const { outcome, record } = await processAttendanceAttempt({
          student,
          exam,
          invigilator: req.user,
          timeStamp,
          recordedOffline: true,
          logMessage: 'Synced from offline device',
        });

        if (outcome === 'duplicate') {
          if (record && record.syncStatus === 'Pending') {
            record.syncStatus = 'Synced';
            await record.save();
          }
          if (record) {
            await SyncLog.create({ attendanceRecord: record._id, syncResult: 'Success', message: 'Already existed, marked synced' });
          }
          results.push({ ...echo, status: 'Synced', note: 'Already recorded (duplicate skipped)' });
        } else {
          results.push({ ...echo, status: 'Synced' });
        }
      } catch (innerError) {
        results.push({ ...echo, status: 'Failed', reason: innerError.message });
      }
    }

    res.status(200).json({ success: true, message: 'Offline records processed', data: results });
  } catch (error) {
    next(error);
  }
};

// @desc  Get attendance records for a specific exam
// @route GET /api/attendance/exam/:examId
const getAttendanceForExam = async (req, res, next) => {
  try {
    const records = await AttendanceRecord.find({ exam: req.params.examId })
      .populate('student')
      .populate('invigilator', 'fullName username')
      .sort({ timeStamp: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all attendance records with optional filters (Admin reports screen)
// @route GET /api/attendance
const getAllAttendance = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.exam) filter.exam = req.query.exam;
    if (req.query.eligibilityStatus) filter.eligibilityStatus = req.query.eligibilityStatus;
    if (req.query.syncStatus) filter.syncStatus = req.query.syncStatus;

    const records = await AttendanceRecord.find(filter)
      .populate('student')
      .populate('exam')
      .populate('invigilator', 'fullName username')
      .sort({ timeStamp: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordAttendance,
  syncOfflineRecords,
  getAttendanceForExam,
  getAllAttendance,
  checkEligibility,
};
