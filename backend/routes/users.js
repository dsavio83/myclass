import express from 'express';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, email, username, password, role, status, mobileNumber } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      username,
      password,
      role,
      status,
      mobileNumber,
    });

    if (user) {
      res.status(201).json(user.toJSON());
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      const { name, email, username, password, role, status, mobileNumber } = req.body;

      user.name = name || user.name;
      user.email = email || user.email;
      user.username = username || user.username;
      user.role = role || user.role;
      user.status = status || user.status;
      user.mobileNumber = mobileNumber !== undefined ? mobileNumber : user.mobileNumber;

      // Only update password if it's provided and not empty
      if (password && password.trim()) {
        // Validate password length
        if (password.trim().length < 3) {
          return res.status(400).json({ message: 'Password must be at least 3 characters long' });
        }
        user.password = password.trim();
      }

      const updatedUser = await user.save();
      res.json(updatedUser.toJSON());
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/', protect, admin, getUsers);
router.post('/', protect, admin, createUser);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

export default router;