const express = require('express');
const router = express.Router();
const { scanStudentQr, getQrScans } = require('../controllers/qrController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/scan', authorize('invigilator'), scanStudentQr);
router.get('/scans', authorize('admin', 'invigilator'), getQrScans);

module.exports = router;
