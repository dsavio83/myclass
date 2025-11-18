import express from 'express';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import SubUnit from '../models/SubUnit.js';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all classes
// @route   GET /api/classes
// @access  Public
const getClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });
    res.json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res) => {
  try {
    const { name } = req.body;

    const classExists = await Class.findOne({ name });

    if (classExists) {
      res.status(400).json({ message: 'Class already exists' });
      return;
    }

    const classItem = await Class.create({ name });

    if (classItem) {
      res.status(201).json(classItem);
    } else {
      res.status(400).json({ message: 'Invalid class data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res) => {
  try {
    const { name } = req.body;
    const classItem = await Class.findById(req.params.id);

    if (classItem) {
      classItem.name = name || classItem.name;
      const updatedClass = await classItem.save();
      res.json(updatedClass);
    } else {
      res.status(404).json({ message: 'Class not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete class (with cascading deletes)
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (classItem) {
      // Delete all related data with cascading
      const subjects = await Subject.find({ classId: classItem._id });
      const subjectIds = subjects.map(s => s._id);

      const units = await Unit.find({ subjectId: { $in: subjectIds } });
      const unitIds = units.map(u => u._id);

      const subUnits = await SubUnit.find({ unitId: { $in: unitIds } });
      const subUnitIds = subUnits.map(su => su._id);

      const lessons = await Lesson.find({ subUnitId: { $in: subUnitIds } });
      const lessonIds = lessons.map(l => l._id);

      // Delete all related content and data
      await Content.deleteMany({ lessonId: { $in: lessonIds } });
      await Lesson.deleteMany({ subUnitId: { $in: subUnitIds } });
      await SubUnit.deleteMany({ unitId: { $in: unitIds } });
      await Unit.deleteMany({ subjectId: { $in: subjectIds } });
      await Subject.deleteMany({ classId: classItem._id });
      await classItem.deleteOne();

      res.json({ message: 'Class and all related data removed' });
    } else {
      res.status(404).json({ message: 'Class not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get subjects by class
// @route   GET /api/classes/:classId/subjects
// @access  Public
const getSubjectsByClass = async (req, res) => {
  try {
    const subjects = await Subject.find({ classId: req.params.classId }).sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new subject
// @route   POST /api/classes/:classId/subjects
// @access  Private/Admin
const createSubject = async (req, res) => {
  try {
    const { name } = req.body;
    const { classId } = req.params;

    const subject = await Subject.create({ name, classId });

    if (subject) {
      res.status(201).json(subject);
    } else {
      res.status(400).json({ message: 'Invalid subject data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/', getClasses);
router.post('/', protect, admin, createClass);
router.put('/:id', protect, admin, updateClass);
router.delete('/:id', protect, admin, deleteClass);
router.get('/:classId/subjects', getSubjectsByClass);
router.post('/:classId/subjects', protect, admin, createSubject);

export default router;