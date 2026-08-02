const mongoose = require('mongoose');

const StudentQrTokenSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    generatedAt: { type: Date, default: Date.now },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentQrToken', StudentQrTokenSchema);
