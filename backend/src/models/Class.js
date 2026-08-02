const mongoose = require('mongoose');

// A class always belongs to one Faculty + Department, so Students can be
// assigned to it by picking it from a dropdown instead of typing free text.
const ClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', ClassSchema);
