import express from 'express';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import SubUnit from '../models/SubUnit.js';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get platform statistics
// @route   GET /api/reports/stats
// @access  Private/Admin
const getPlatformStats = async (req, res) => {
  try {
    // Get counts for all collections
    const [
      classCount,
      subjectCount,
      unitCount,
      subUnitCount,
      lessonCount,
      contentCount,
      userCount,
      adminCount,
      teacherCount,
      contentByType
    ] = await Promise.all([
      Class.countDocuments(),
      Subject.countDocuments(),
      Unit.countDocuments(),
      SubUnit.countDocuments(),
      Lesson.countDocuments(),
      Content.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'teacher' }),
      Content.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { _id: 0, type: '$_id', count: 1 } }
      ])
    ]);

    // Convert contentByType array to object
    const contentTypeCounts = {};
    contentByType.forEach(item => {
      contentTypeCounts[item.type] = item.count;
    });

    const stats = {
      classCount,
      subjectCount,
      unitCount,
      subUnitCount,
      lessonCount,
      contentCount,
      userCount,
      adminCount,
      teacherCount: teacherCount + adminCount, // Include admin count in teacherCount for backward compatibility
      contentByType: contentTypeCounts
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/stats', protect, admin, getPlatformStats);

export default router;