const express = require('express');
const router = express.Router();
const {
  recordAttendance, syncOfflineRecords, getAttendanceForExam, getAllAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', authorize('admin'), getAllAttendance);
router.post('/', recordAttendance); // Admin + Invigilator
router.post('/sync', syncOfflineRecords); // Admin + Invigilator
router.get('/exam/:examId', getAttendanceForExam); // Admin + Invigilator

module.exports = router;
