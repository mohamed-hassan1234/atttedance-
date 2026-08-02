const express = require('express');
const router = express.Router();
const { getOverview, getByDepartment } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect, authorize('admin'));

router.get('/overview', getOverview);
router.get('/by-department', getByDepartment);

module.exports = router;
