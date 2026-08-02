const Faculty = require('../models/Faculty');

// @desc  Get all faculties with their departments (shared list used by every form)
// @route GET /api/faculties
const getFaculties = async (req, res, next) => {
  try {
    const faculties = await Faculty.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: faculties.length, data: faculties });
  } catch (error) {
    next(error);
  }
};

// @desc  Create a faculty (Admin only)
// @route POST /api/faculties
const createFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.create(req.body);
    res.status(201).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

// @desc  Update a faculty's name/departments (Admin only)
// @route PUT /api/faculties/:id
const updateFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    res.status(200).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete a faculty (Admin only)
// @route DELETE /api/faculties/:id
const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    res.status(200).json({ success: true, message: 'Faculty removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFaculties, createFaculty, updateFaculty, deleteFaculty };
