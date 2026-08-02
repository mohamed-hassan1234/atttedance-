const mongoose = require('mongoose');

const QrScanRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentIdSnapshot: { type: String, default: '' },
    invigilator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invigilatorNameSnapshot: { type: String, required: true },
    qrTokenReference: { type: String, required: true },
    scanStatus: {
      type: String,
      enum: ['Successful', 'Invalid QR', 'Student inactive', 'QR deactivated', 'Duplicate scan', 'Access denied'],
      required: true,
    },
    scannedAt: { type: Date, required: true, default: Date.now },
    deviceInfo: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

QrScanRecordSchema.index({ invigilator: 1, scannedAt: -1 });
QrScanRecordSchema.index({ studentIdSnapshot: 1, scannedAt: -1 });
QrScanRecordSchema.index({ qrTokenReference: 1, invigilator: 1, scannedAt: -1 });

module.exports = mongoose.model('QrScanRecord', QrScanRecordSchema);
