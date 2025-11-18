import express from 'express';
import Unit from '../models/Unit.js';
import SubUnit from '../models/SubUnit.js';
import Lesson from '../models/Lesson.js';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all units
// @route   GET /api/units
// @access  Public
const getUnits = async (req, res) => {
  try {
    const units = await Unit.find().populate('subjectId', 'name').sort({ name: 1 });
    res.json(units);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new unit
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

// @desc    Update unit
// @route   PUT /api/units/:id
// @access  Private/Admin
const updateUnit = async (req, res) => {
  try {
    const { name } = req.body;
    const unit = await Unit.findById(req.params.id);

    if (unit) {
      unit.name = name || unit.name;
      const updatedUnit = await unit.save();
      res.json(updatedUnit);
    } else {
      res.status(404).json({ message: 'Unit not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete unit (with cascading deletes)
// @route   DELETE /api/units/:id
// @access  Private/Admin
const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (unit) {
      // Delete all related data with cascading
      const subUnits = await SubUnit.find({ unitId: unit._id });
      const subUnitIds = subUnits.map(su => su._id);

      const lessons = await Lesson.find({ subUnitId: { $in: subUnitIds } });
      const lessonIds = lessons.map(l => l._id);

      // Delete all related content and data
      await Content.deleteMany({ lessonId: { $in: lessonIds } });
      await Lesson.deleteMany({ subUnitId: { $in: subUnitIds } });
      await SubUnit.deleteMany({ unitId: unit._id });
      await unit.deleteOne();

      res.json({ message: 'Unit and all related data removed' });
    } else {
      res.status(404).json({ message: 'Unit not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get sub-units by unit
// @route   GET /api/units/:unitId/sub-units
// @access  Public
const getSubUnitsByUnit = async (req, res) => {
  try {
    const subUnits = await SubUnit.find({ unitId: req.params.unitId }).sort({ name: 1 });
    res.json(subUnits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new sub-unit for a unit
// @route   POST /api/units/:unitId/sub-units
// @access  Private/Admin
const createSubUnitForUnit = async (req, res) => {
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

router.get('/', getUnits);
router.put('/:id', protect, admin, updateUnit);
router.delete('/:id', protect, admin, deleteUnit);
router.get('/:unitId/sub-units', getSubUnitsByUnit);
router.post('/:unitId/sub-units', protect, admin, createSubUnitForUnit);

export default router;