const express = require('express');
const router = express.Router();
const {
  getClasses, createClass, updateClass, deleteClass,
} = require('../controllers/classController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.route('/').get(getClasses).post(authorize('admin'), createClass);
router.route('/:id').put(authorize('admin'), updateClass).delete(authorize('admin'), deleteClass);

module.exports = router;
