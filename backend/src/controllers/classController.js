const Class = require('../models/Class');

// @desc  Get all classes (used by the Student form's Class dropdown)
// @route GET /api/classes
const getClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    next(error);
  }
};

// @desc  Create a class (Admin only)
// @route POST /api/classes
const createClass = async (req, res, next) => {
  try {
    const schoolClass = await Class.create(req.body);
    res.status(201).json({ success: true, data: schoolClass });
  } catch (error) {
    next(error);
  }
};

// @desc  Update a class (Admin only)
// @route PUT /api/classes/:id
const updateClass = async (req, res, next) => {
  try {
    const schoolClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!schoolClass) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, data: schoolClass });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete a class (Admin only)
// @route DELETE /api/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    const schoolClass = await Class.findByIdAndDelete(req.params.id);
    if (!schoolClass) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, message: 'Class removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClasses, createClass, updateClass, deleteClass };
