const Examination = require('../models/Examination');
const Student = require('../models/Student');

// @desc  Get all examinations (optionally filter by date/status/invigilator)
// @route GET /api/exams
const getExams = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.mine === 'true' && req.user.role === 'invigilator') {
      filter.assignedInvigilators = req.user._id;
    }

    const exams = await Examination.find(filter)
      .populate('assignedInvigilators', 'fullName username')
      .sort({ examDate: 1 });

    res.status(200).json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single examination
// @route GET /api/exams/:id
const getExam = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id).populate('assignedInvigilators', 'fullName username');
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @desc  Create examination (Admin only)
// @route POST /api/exams
const createExam = async (req, res, next) => {
  try {
    const exam = await Examination.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @desc  Update examination (Admin only)
// @route PUT /api/exams/:id
const updateExam = async (req, res, next) => {
  try {
    const exam = await Examination.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete examination (Admin only)
// @route DELETE /api/exams/:id
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Examination.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });
    res.status(200).json({ success: true, message: 'Examination removed' });
  } catch (error) {
    next(error);
  }
};

// @desc  Get the students expected to take an exam (matched by Faculty + Department)
// @route GET /api/exams/:id/roster
const getExamRoster = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    const students = await Student.find({ faculty: exam.faculty, department: exam.department }).sort({ fullName: 1 });

    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    next(error);
  }
};

module.exports = { getExams, getExam, createExam, updateExam, deleteExam, getExamRoster };
