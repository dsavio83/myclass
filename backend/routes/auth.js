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

      // Handle password update with validation
      if (password !== undefined) {
        if (!password || password.trim().length < 3) {
          return res.status(400).json({ message: 'Password must be at least 3 characters long' });
        }
        
        console.log('Before password update - password length:', password.length);
        console.log('Before password update - password starts with $2:', password.startsWith('$2'));
        
        user.password = password.trim();
        user.markModified('password'); // Force Mongoose to rehash the password
        
        console.log('After setting user.password - checking isModified:', user.isModified('password'));
        
        // Save user and get the updated version
        const updatedUser = await user.save();
        console.log('Password updated successfully. New password hash length:', updatedUser.password.length);
        console.log('New password hash starts with $2:', updatedUser.password.startsWith('$2'));
      }
      
      // Handle mobile number update
      if (mobileNumber !== undefined) {
        user.mobileNumber = mobileNumber.toString().trim();
        console.log('Mobile number updated for user:', user.username, user.mobileNumber);
      }
      
      // Mark as no longer first login
      user.isFirstLogin = false;

      const finalUser = await user.save();
      console.log('User profile updated successfully:', finalUser.username);

      res.json(finalUser.toJSON());
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

router.post('/login', loginUser);
router.put('/me/profile', protect, updateProfile);

export default router;