const AttendanceRecord = require('../models/AttendanceRecord');
const SyncLog = require('../models/SyncLog');
const Student = require('../models/Student');
const Examination = require('../models/Examination');
const { checkEligibility } = require('../utils/eligibility');

// @desc  Record attendance for a student in an exam (online path)
// @route POST /api/attendance
// @body  { studentId, examId }
const recordAttendance = async (req, res, next) => {
  try {
    const { studentId, examId } = req.body;

    const student = await Student.findOne({ studentId: studentId.trim().toUpperCase() });
    if (!student) {
      return res.status(404).json({ success: false, message: `No student found with ID ${studentId}` });
    }

    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Duplicate prevention (FR-12)
    const existing = await AttendanceRecord.findOne({ student: student._id, exam: exam._id });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `${student.fullName} (${student.studentId}) has already been marked present for this examination`,
        data: existing,
      });
    }

    const { eligible, reason } = checkEligibility(student, exam);

    const record = await AttendanceRecord.create({
      student: student._id,
      studentIdSnapshot: student.studentId,
      exam: exam._id,
      invigilator: req.user._id,
      timeStamp: new Date(),
      syncStatus: 'Synced',
      eligibilityStatus: eligible ? 'Eligible' : 'Not Eligible',
      eligibilityReason: reason,
      recordedOffline: false,
    });

    await SyncLog.create({ attendanceRecord: record._id, syncResult: 'Success', message: 'Recorded online' });

    const populated = await record.populate([
      { path: 'student' },
      { path: 'exam' },
      { path: 'invigilator', select: 'fullName username' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate attendance record for this student and exam' });
    }
    next(error);
  }
};

// @desc  Bulk-sync attendance records captured while offline on the invigilator's device
// @route POST /api/attendance/sync
// @body  { records: [{ studentId, examId, timeStamp }] }
const syncOfflineRecords = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No offline records provided to sync' });
    }

    const results = [];

    for (const item of records) {
      try {
        const student = await Student.findOne({ studentId: item.studentId.trim().toUpperCase() });
        const exam = await Examination.findById(item.examId);

        if (!student || !exam) {
          results.push({ studentId: item.studentId, status: 'Failed', reason: 'Student or exam not found' });
          continue;
        }

        const existing = await AttendanceRecord.findOne({ student: student._id, exam: exam._id });
        if (existing) {
          if (existing.syncStatus === 'Pending') {
            existing.syncStatus = 'Synced';
            await existing.save();
          }
          await SyncLog.create({ attendanceRecord: existing._id, syncResult: 'Success', message: 'Already existed, marked synced' });
          results.push({ studentId: item.studentId, status: 'Synced', note: 'Already recorded (duplicate skipped)' });
          continue;
        }

        const { eligible, reason } = checkEligibility(student, exam);

        const record = await AttendanceRecord.create({
          student: student._id,
          studentIdSnapshot: student.studentId,
          exam: exam._id,
          invigilator: req.user._id,
          timeStamp: item.timeStamp ? new Date(item.timeStamp) : new Date(),
          syncStatus: 'Synced',
          eligibilityStatus: eligible ? 'Eligible' : 'Not Eligible',
          eligibilityReason: reason,
          recordedOffline: true,
        });

        await SyncLog.create({ attendanceRecord: record._id, syncResult: 'Success', message: 'Synced from offline device' });
        results.push({ studentId: item.studentId, status: 'Synced' });
      } catch (innerError) {
        results.push({ studentId: item.studentId, status: 'Failed', reason: innerError.message });
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
