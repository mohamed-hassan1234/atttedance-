const Student = require('../models/Student');
const { assignStudentQrToken } = require('../utils/qrTokens');
const { checkStudentStanding } = require('../utils/eligibility');

// This controller simulates the "University API" the real documentation describes.
// In production, lookupStudent would call an external HTTPS endpoint; here it
// reads from the local STUDENT cache collection which seedData.js populates.

// @desc  Get all students (Admin only, for management screens)
// @route GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find().sort({ fullName: 1 });
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    next(error);
  }
};

// @desc  Get one student profile (Admin only)
// @route GET /api/students/:id
const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// @desc  Lookup one student by Student ID (used by Scan/Search screen)
// @route GET /api/students/lookup/:studentId
const lookupStudent = async (req, res, next) => {
  try {
    const studentId = req.params.studentId.trim().toUpperCase();
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: `No student found with ID ${studentId}` });
    }

    const { blocked, reason } = checkStudentStanding(student);

    res.status(200).json({
      success: true,
      data: { ...student.toObject(), blocked, blockReason: reason },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Create student record (Admin only - normally synced from University API)
// @route POST /api/students
const createStudent = async (req, res, next) => {
  try {
    const student = await Student.create(req.body);
    await assignStudentQrToken(student);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// @desc  Update student record (Admin only)
// @route PUT /api/students/:id
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete student record (Admin only)
// @route DELETE /api/students/:id
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student removed' });
  } catch (error) {
    next(error);
  }
};

// @desc  Get a student's active QR details (Admin only)
// @route GET /api/students/:id/qr
const getStudentQr = async (req, res, next) => {
  try {
    let student = await Student.findById(req.params.id).select('+qrToken');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!student.qrToken) {
      student = await assignStudentQrToken(student);
    }

    res.status(200).json({
      success: true,
      data: {
        student,
        qrToken: student.qrToken,
        qrStatus: student.qrStatus,
        qrGeneratedAt: student.qrGeneratedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Regenerate a student's QR code and deactivate the old token (Admin only)
// @route POST /api/students/:id/regenerate-qr
const regenerateStudentQr = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).select('+qrToken');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    await assignStudentQrToken(student, { replace: true });

    res.status(200).json({
      success: true,
      message: 'Student QR code regenerated successfully',
      data: {
        student,
        qrToken: student.qrToken,
        qrStatus: student.qrStatus,
        qrGeneratedAt: student.qrGeneratedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudent,
  lookupStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentQr,
  regenerateStudentQr,
};
