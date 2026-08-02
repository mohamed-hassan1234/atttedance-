const express = require('express');
const router = express.Router();
const { getExams, getExam, createExam, updateExam, deleteExam, getExamRoster } = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect); // both roles can view

router.route('/')
  .get(getExams)
  .post(authorize('admin'), createExam);

router.get('/:id/roster', getExamRoster); // both roles

router.route('/:id')
  .get(getExam)
  .put(authorize('admin'), updateExam)
  .delete(authorize('admin'), deleteExam);

module.exports = router;
