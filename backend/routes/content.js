import express from 'express';
import Content from '../models/Content.js';
import { protect, admin, teacher } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get contents by lesson
// @route   GET /api/lessons/:lessonId/contents
// @access  Public
const getContentsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { types } = req.query; // Optional filter by types

    let query = { lessonId };
    if (types) {
      const typeArray = types.split(',');
      query.type = { $in: typeArray };
    }

    const contents = await Content.find(query).sort({ createdAt: -1 });

    // Group contents by type
    const grouped = contents.reduce((acc, content) => {
      if (!acc[content.type]) {
        acc[content.type] = { type: content.type, count: 0, docs: [] };
      }
      acc[content.type].docs.push(content);
      acc[content.type].count++;
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get content counts by lesson
// @route   GET /api/lessons/:lessonId/counts
// @access  Public
const getContentCounts = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const contents = await Content.find({ lessonId });
    const counts = contents.reduce((acc, content) => {
      acc[content.type] = (acc[content.type] || 0) + 1;
      return acc;
    }, {});

    res.json(counts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new content
// @route   POST /api/lessons/:lessonId/contents
// @access  Private/Admin
const createContent = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { type, title, body, metadata } = req.body;

    // Generate title if not provided
    const contentTitle = title && title.trim() ? title.trim() : `${type.charAt(0).toUpperCase() + type.slice(1)} - ${lessonId}`;

    const content = await Content.create({
      lessonId,
      type,
      title: contentTitle,
      body,
      metadata
    });

    if (content) {
      res.status(201).json(content);
    } else {
      res.status(400).json({ message: 'Invalid content data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create multiple contents (bulk)
// @route   POST /api/lessons/:lessonId/contents/bulk
// @access  Private/Admin
const createBulkContent = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const contentData = req.body;

    const contents = await Content.insertMany(
      contentData.map(item => ({
        ...item,
        lessonId
      }))
    );

    if (contents.length > 0) {
      res.status(201).json(contents);
    } else {
      res.status(400).json({ message: 'Invalid content data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update content
// @route   PUT /api/contents/:id
// @access  Private/Admin
const updateContent = async (req, res) => {
  try {
    const { type, title, body, metadata } = req.body;
    const content = await Content.findById(req.params.id);

    if (content) {
      if (type) content.type = type;
      if (title) content.title = title;
      if (body) content.body = body;
      if (metadata) content.metadata = metadata;

      const updatedContent = await content.save();
      res.json(updatedContent);
    } else {
      res.status(404).json({ message: 'Content not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete content
// @route   DELETE /api/contents/:id
// @access  Private/Admin
const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (content) {
      await content.deleteOne();
      res.json({ message: 'Content removed' });
    } else {
      res.status(404).json({ message: 'Content not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/lessons/:lessonId/contents', getContentsByLesson);
router.get('/lessons/:lessonId/counts', getContentCounts);
router.post('/lessons/:lessonId/contents', protect, admin, createContent);
router.post('/lessons/:lessonId/contents/bulk', protect, admin, createBulkContent);
router.put('/contents/:id', protect, admin, updateContent);
router.delete('/contents/:id', protect, admin, deleteContent);

export default router;