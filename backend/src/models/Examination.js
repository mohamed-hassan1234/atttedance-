const mongoose = require('mongoose');

const ExaminationSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true }, // e.g. "11:00"
    examRoom: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    requireFeeCheck: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    assignedInvigilators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Examination', ExaminationSchema);
