const mongoose = require('mongoose');

// Single shared source of truth for Faculty/Department names, so Students,
// Examinations, and any other screen all select from (and stay consistent
// with) the same list instead of free-typing values that can drift apart.
const FacultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    departments: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faculty', FacultySchema);
