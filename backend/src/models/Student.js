const mongoose = require('mongoose');

// Local cache of student data, normally sourced from the University API.
const StudentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    className: { type: String, trim: true, default: '' },
    feeStatus: {
      type: String,
      enum: ['Cleared', 'Not Cleared'],
      default: 'Cleared',
    },
    absenceCount: { type: Number, default: 0, min: 0 },
    photoUrl: { type: String, default: '' },
    email: { type: String, trim: true, lowercase: true },
    qrToken: { type: String, unique: true, sparse: true, index: true, select: false },
    qrStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    qrGeneratedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', StudentSchema);
