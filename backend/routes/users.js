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

// @desc    Get user profile
// @route   GET /api/users/me/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    res.json(req.user);
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
    console.log('UpdateProfile called with user:', req.user);
    console.log('UpdateProfile called with body:', req.body);
    
    // Use req.user.id instead of req.user._id for consistency
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user:', user.name, user.email);

    const { name, email, username, mobileNumber, password } = req.body;

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
      console.log('Password updated for user:', user.username);
    }

    // Only update fields that are provided and not empty
    if (name !== undefined && name !== null) {
      user.name = name.trim() || user.name;
      console.log('Updated name to:', user.name);
    }
    
    if (email !== undefined && email !== null) {
      user.email = email.trim() || user.email;
      console.log('Updated email to:', user.email);
    }
    
    if (username !== undefined && username !== null) {
      user.username = username.trim() || user.username;
      console.log('Updated username to:', user.username);
    }
    
    if (mobileNumber !== undefined && mobileNumber !== null) {
      user.mobileNumber = mobileNumber.toString().trim();
      console.log('Updated mobileNumber to:', user.mobileNumber);
    }

    // Mark as no longer first login if it was true
    if (user.isFirstLogin === true) {
      user.isFirstLogin = false;
    }

    console.log('User before save:', user.toJSON());
    const updatedUser = await user.save();
    console.log('User after save:', updatedUser.toJSON());
    console.log('Password after save - hash length:', updatedUser.password.length);
    console.log('Password after save - starts with $2:', updatedUser.password.startsWith('$2'));
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/users/me/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ message: 'New password must be at least 3 characters long' });
    }

    const user = await User.findById(req.user._id);
    
    if (user) {
      // Check if current password is correct
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User profile routes
router.get('/me/profile', protect, getProfile);
router.put('/me/profile', protect, updateProfile);
router.put('/me/password', protect, changePassword);

// Admin user management routes
router.get('/', protect, admin, getUsers);
router.post('/', protect, admin, createUser);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

export default router;