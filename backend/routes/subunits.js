import express from 'express';
import SubUnit from '../models/SubUnit.js';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all sub-units
// @route   GET /api/sub-units
// @access  Public
const getSubUnits = async (req, res) => {
  try {
    const subUnits = await SubUnit.find().populate('unitId', 'name').sort({ name: 1 });
    res.json(subUnits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new sub-unit
// @route   POST /api/units/:unitId/sub-units
// @access  Private/Admin
const createSubUnit = async (req, res) => {
  try {
    const { name } = req.body;
    const { unitId } = req.params;

    const subUnit = await SubUnit.create({ name, unitId });

    if (subUnit) {
      res.status(201).json(subUnit);
    } else {
      res.status(400).json({ message: 'Invalid sub-unit data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update sub-unit
// @route   PUT /api/sub-units/:id
// @access  Private/Admin
const updateSubUnit = async (req, res) => {
  try {
    const { name } = req.body;
    const subUnit = await SubUnit.findById(req.params.id);

    if (subUnit) {
      subUnit.name = name || subUnit.name;
      const updatedSubUnit = await subUnit.save();
      res.json(updatedSubUnit);
    } else {
      res.status(404).json({ message: 'Sub-unit not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete sub-unit (with cascading deletes)
// @route   DELETE /api/sub-units/:id
// @access  Private/Admin
const deleteSubUnit = async (req, res) => {
  try {
    const subUnit = await SubUnit.findById(req.params.id);

    if (subUnit) {
      // Delete all related data with cascading
      const lessons = await Lesson.find({ subUnitId: subUnit._id });
      const lessonIds = lessons.map(l => l._id);

      // Delete all related content and data
      await Content.deleteMany({ lessonId: { $in: lessonIds } });
      await Lesson.deleteMany({ subUnitId: subUnit._id });
      await subUnit.deleteOne();

      res.json({ message: 'Sub-unit and all related data removed' });
    } else {
      res.status(404).json({ message: 'Sub-unit not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get lessons by sub-unit
// @route   GET /api/sub-units/:subUnitId/lessons
// @access  Public
const getLessonsBySubUnit = async (req, res) => {
  try {
    const lessons = await Lesson.find({ subUnitId: req.params.subUnitId }).sort({ name: 1 });
    res.json(lessons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new lesson for a sub-unit
// @route   POST /api/sub-units/:subUnitId/lessons
// @access  Private/Admin
const createLessonForSubUnit = async (req, res) => {
  try {
    const { name } = req.body;
    const { subUnitId } = req.params;

    const lesson = await Lesson.create({ name, subUnitId });

    if (lesson) {
      res.status(201).json(lesson);
    } else {
      res.status(400).json({ message: 'Invalid lesson data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/', getSubUnits);
router.put('/:id', protect, admin, updateSubUnit);
router.delete('/:id', protect, admin, deleteSubUnit);
router.get('/:subUnitId/lessons', getLessonsBySubUnit);
router.post('/:subUnitId/lessons', protect, admin, createLessonForSubUnit);

export default router;