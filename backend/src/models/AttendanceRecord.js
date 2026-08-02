const mongoose = require('mongoose');

const AttendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentIdSnapshot: { type: String, required: true }, // preserved even if offline
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Examination', required: true },
    invigilator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeStamp: { type: Date, required: true, default: Date.now },
    syncStatus: {
      type: String,
      enum: ['Synced', 'Pending'],
      default: 'Synced',
    },
    eligibilityStatus: {
      type: String,
      enum: ['Eligible', 'Not Eligible'],
      required: true,
    },
    eligibilityReason: { type: String, default: '' }, // why rejected, if applicable
    recordedOffline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for the same student in the same exam
AttendanceRecordSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
