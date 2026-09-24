const AttendanceRecord = require('../models/AttendanceRecord');
const SyncLog = require('../models/SyncLog');
const { checkEligibility } = require('../utils/eligibility');

// Admins may record for any exam; invigilators only for exams they are assigned to
// (the same rule GET /exams?mine=true uses to list their exams).
const canRecordForExam = (exam, user) => {
  if (!exam || !user) return false;
  if (user.role === 'admin') return true;
  const assigned = exam.assignedInvigilators || [];
  return assigned.some((entry) => String(entry?._id || entry) === String(user._id));
};

// The one place attendance is written. Manual entry, QR scan and offline sync all
// go through here so eligibility rules and the audit trail can never diverge.
//
// A record is created even when the student is Not Eligible (audit trail of
// rejected attempts). Duplicates (student + exam) resolve to { outcome: 'duplicate' }
// whether caught by the pre-check or by the unique index.
const processAttendanceAttempt = async (
  { student, exam, invigilator, timeStamp, recordedOffline = false, logMessage = 'Recorded online' },
  deps = { AttendanceRecord, SyncLog }
) => {
  const { AttendanceRecord: Records, SyncLog: Logs } = deps;

  const existing = await Records.findOne({ student: student._id, exam: exam._id });
  if (existing) return { outcome: 'duplicate', record: existing };

  const { eligible, reason } = checkEligibility(student, exam);

  let record;
  try {
    record = await Records.create({
      student: student._id,
      studentIdSnapshot: student.studentId,
      exam: exam._id,
      invigilator: invigilator._id,
      timeStamp: timeStamp || new Date(),
      syncStatus: 'Synced',
      eligibilityStatus: eligible ? 'Eligible' : 'Not Eligible',
      eligibilityReason: reason,
      recordedOffline,
    });
  } catch (error) {
    if (error.code === 11000) {
      const raced = await Records.findOne({ student: student._id, exam: exam._id });
      return { outcome: 'duplicate', record: raced };
    }
    throw error;
  }

  await Logs.create({ attendanceRecord: record._id, syncResult: 'Success', message: logMessage });
  return { outcome: 'created', record };
};

module.exports = { processAttendanceAttempt, canRecordForExam };
