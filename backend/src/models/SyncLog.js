const mongoose = require('mongoose');

const SyncLogSchema = new mongoose.Schema(
  {
    attendanceRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
    syncTime: { type: Date, default: Date.now },
    syncResult: { type: String, enum: ['Success', 'Failed'], required: true },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncLog', SyncLogSchema);
