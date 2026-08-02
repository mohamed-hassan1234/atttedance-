const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudent,
  lookupStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentQr,
  regenerateStudentQr,
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/lookup/:studentId', lookupStudent); // Admin + Invigilator (scan/search screen)
router.route('/').get(authorize('admin'), getStudents).post(authorize('admin'), createStudent);
router.get('/:id/qr', authorize('admin'), getStudentQr);
router.post('/:id/regenerate-qr', authorize('admin'), regenerateStudentQr);
router.route('/:id').get(authorize('admin'), getStudent).put(authorize('admin'), updateStudent).delete(authorize('admin'), deleteStudent);

module.exports = router;
