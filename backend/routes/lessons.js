import express from 'express';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all lessons
// @route   GET /api/lessons
// @access  Public
const getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find().populate('subUnitId', 'name').sort({ name: 1 });
    res.json(lessons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new lesson
// @route   POST /api/sub-units/:subUnitId/lessons
// @access  Private/Admin
const createLesson = async (req, res) => {
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

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private/Admin
const updateLesson = async (req, res) => {
  try {
    const { name } = req.body;
    const lesson = await Lesson.findById(req.params.id);

    if (lesson) {
      lesson.name = name || lesson.name;
      const updatedLesson = await lesson.save();
      res.json(updatedLesson);
    } else {
      res.status(404).json({ message: 'Lesson not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete lesson (with cascading deletes)
// @route   DELETE /api/lessons/:id
// @access  Private/Admin
const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (lesson) {
      // Delete all related content
      await Content.deleteMany({ lessonId: lesson._id });
      await lesson.deleteOne();

      res.json({ message: 'Lesson and all related content removed' });
    } else {
      res.status(404).json({ message: 'Lesson not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get breadcrumbs for lesson
// @route   GET /api/lessons/:lessonId/breadcrumbs
// @access  Public
const getBreadcrumbs = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId).populate({
      path: 'subUnitId',
      populate: {
        path: 'unitId',
        populate: {
          path: 'subjectId',
          populate: {
            path: 'classId',
            select: 'name'
          }
        }
      }
    });

    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const path = `${lesson.subUnitId.unitId.subjectId.classId.name} > ${lesson.subUnitId.unitId.subjectId.name} > ${lesson.subUnitId.unitId.name} > ${lesson.subUnitId.name} > ${lesson.name}`;
    res.json({ path });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/', getLessons);
router.put('/:id', protect, admin, updateLesson);
router.delete('/:id', protect, admin, deleteLesson);
router.get('/:lessonId/breadcrumbs', getBreadcrumbs);

export default router;