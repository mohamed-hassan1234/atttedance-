const express = require('express');
const router = express.Router();
const {
  getFaculties, createFaculty, updateFaculty, deleteFaculty,
} = require('../controllers/facultyController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.route('/').get(getFaculties).post(authorize('admin'), createFaculty);
router.route('/:id').put(authorize('admin'), updateFaculty).delete(authorize('admin'), deleteFaculty);

module.exports = router;
