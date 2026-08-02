const express = require('express');
const router = express.Router();
const {
  getUsers, getUser, createUser, updateUser, resetPassword, deleteUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All user-management routes are Admin only
router.use(protect, authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);
router.put('/:id/reset-password', resetPassword);

module.exports = router;
