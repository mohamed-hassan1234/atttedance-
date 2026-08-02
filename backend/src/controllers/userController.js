const User = require('../models/User');

const normalizeInvigilatorId = (value) => (value ? value.trim().toUpperCase() : undefined);

// @desc  Get all users (Admin only)
// @route GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.search) {
      const search = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ fullName: search }, { username: search }, { email: search }, { invigilatorId: search }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single user
// @route GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc  Create new user (Admin only)
// @route POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { fullName, username, email, password, role, invigilatorId, phone, isActive } = req.body;
    if (!fullName || !username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Full name, username, email, password, and role are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (role === 'invigilator' && !invigilatorId) {
      return res.status(400).json({ success: false, message: 'Invigilator ID is required for Invigilator accounts' });
    }

    const user = await User.create({
      fullName,
      username,
      email,
      password,
      role,
      invigilatorId: role === 'invigilator' ? normalizeInvigilatorId(invigilatorId) : undefined,
      phone,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// @desc  Update user (Admin only)
// @route PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { fullName, email, role, isActive, invigilatorId, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (invigilatorId !== undefined) user.invigilatorId = normalizeInvigilatorId(invigilatorId);

    await user.save();
    res.status(200).json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// @desc  Reset a user's password (Admin only)
// @route PUT /api/users/:id/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Deactivate / remove user (Admin only) - soft delete by default
// @route DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.query.hard === 'true') {
      await user.deleteOne();
      return res.status(200).json({ success: true, message: 'User permanently removed' });
    }

    user.isActive = false;
    await user.save();
    res.status(200).json({ success: true, message: 'User deactivated', data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, resetPassword, deleteUser };
