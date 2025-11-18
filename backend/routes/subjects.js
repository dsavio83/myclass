import express from 'express';
import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import SubUnit from '../models/SubUnit.js';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Public
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().populate('classId', 'name').sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Admin
const updateSubject = async (req, res) => {
  try {
    const { name } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (subject) {
      subject.name = name || subject.name;
      const updatedSubject = await subject.save();
      res.json(updatedSubject);
    } else {
      res.status(404).json({ message: 'Subject not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete subject (with cascading deletes)
// @route   DELETE /api/subjects/:id
// @access  Private/Admin
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (subject) {
      // Delete all related data with cascading
      const units = await Unit.find({ subjectId: subject._id });
      const unitIds = units.map(u => u._id);

      const subUnits = await SubUnit.find({ unitId: { $in: unitIds } });
      const subUnitIds = subUnits.map(su => su._id);

      const lessons = await Lesson.find({ subUnitId: { $in: subUnitIds } });
      const lessonIds = lessons.map(l => l._id);

      // Delete all related content and data
      await Content.deleteMany({ lessonId: { $in: lessonIds } });
      await Lesson.deleteMany({ subUnitId: { $in: subUnitIds } });
      await SubUnit.deleteMany({ unitId: { $in: unitIds } });
      await Unit.deleteMany({ subjectId: subject._id });
      await subject.deleteOne();

      res.json({ message: 'Subject and all related data removed' });
    } else {
      res.status(404).json({ message: 'Subject not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get units by subject
// @route   GET /api/subjects/:subjectId/units
// @access  Public
const getUnitsBySubject = async (req, res) => {
  try {
    const units = await Unit.find({ subjectId: req.params.subjectId }).sort({ name: 1 });
    res.json(units);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/', getSubjects);
router.put('/:id', protect, admin, updateSubject);
router.delete('/:id', protect, admin, deleteSubject);
router.get('/:subjectId/units', getUnitsBySubject);

// @desc    Create new unit for subject
// @route   POST /api/subjects/:subjectId/units
// @access  Private/Admin
const createUnit = async (req, res) => {
  try {
    const { name } = req.body;
    const { subjectId } = req.params;

    const unit = await Unit.create({ name, subjectId });

    if (unit) {
      res.status(201).json(unit);
    } else {
      res.status(400).json({ message: 'Invalid unit data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.post('/:subjectId/units', protect, admin, createUnit);

export default router;