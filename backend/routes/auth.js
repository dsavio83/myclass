import express from 'express';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (user && (await user.matchPassword(password))) {
      res.json({
        token: generateToken(user._id),
        user: user.toJSON(),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/me/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const { password, mobileNumber } = req.body;

      if (password) {
        user.password = password;
      }
      if (mobileNumber !== undefined) {
        user.mobileNumber = mobileNumber;
      }
      user.isFirstLogin = false;

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

router.post('/login', loginUser);
router.put('/me/profile', protect, updateProfile);

export default router;