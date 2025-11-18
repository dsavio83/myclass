import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import Content from '../models/Content.js';
import Lesson from '../models/Lesson.js';
import { singleFileUpload, generateDefaultFilename } from '../utils/multer.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// @desc    Upload file and create content
// @route   POST /api/upload
// @access  Private/Admin
const uploadFile = async (req, res) => {
  try {
    singleFileUpload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ 
          message: err.message || 'File upload failed',
          error: err.code || 'UPLOAD_ERROR'
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { lessonId, title, contentType } = req.body;
      const { originalname, filename, path: filePath, mimetype, size } = req.file;

      if (!lessonId || !title || !contentType) {
        // Clean up uploaded file if validation fails
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Missing required fields: lessonId, title, contentType' });
      }

      // Create content with file path
      const content = await Content.create({
        lessonId,
        type: contentType,
        title,
        body: `/${filePath.replace(/\\/g, '/')}`, // Convert Windows path to URL format
        metadata: {
          originalName: originalname,
          uploadedAt: new Date(),
          fileType: mimetype,
          fileSize: size,
          storagePath: filePath
        }
      });

      if (content) {
        res.status(201).json(content);
      } else {
        // Clean up uploaded file if content creation fails
        fs.unlinkSync(filePath);
        res.status(400).json({ message: 'Failed to create content' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// @desc    Get suggested filename based on lesson context
// @route   GET /api/filename-suggestion/:lessonId
// @access  Private/Admin
const getFilenameSuggestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { fileType = 'pdf' } = req.query;
    
    const lesson = await Lesson.findById(lessonId).populate({
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
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Get the names
    const className = lesson.subUnitId?.unitId?.subjectId?.classId?.name || 'Unknown_Class';
    const subjectName = lesson.subUnitId?.unitId?.subjectId?.name || 'Unknown_Subject';
    const unitName = lesson.subUnitId?.unitId?.name || 'Unknown_Unit';
    const subUnitName = lesson.subUnitId?.name || 'Unknown_SubUnit';
    const lessonName = lesson.name || 'Unknown_Lesson';
    
    // Add extension based on file type
    const extension = fileType === 'pdf' ? '.pdf' : 
                     fileType === 'video' ? '.mp4' : 
                     fileType === 'audio' ? '.mp3' : '';
    
    const suggestedFilename = generateDefaultFilename(
      className, 
      subjectName + '_' + unitName + '_' + subUnitName, 
      lessonName, 
      extension
    );
    
    res.json({ suggestedFilename, originalParts: { className, subjectName, unitName, subUnitName, lessonName } });
  } catch (error) {
    console.error('Error generating filename suggestion:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete file and content
// @route   DELETE /api/files/:contentId
// @access  Private/Admin
const deleteFile = async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Delete physical file if it exists
    if (content.body.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), content.body);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete content from database
    await content.deleteOne();

    res.json({ message: 'File and content deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error during file deletion' });
  }
};

// Routes
router.post('/upload', protect, admin, uploadFile);
router.get('/filename-suggestion/:lessonId', protect, admin, getFilenameSuggestion);
router.delete('/files/:contentId', protect, admin, deleteFile);

export default router;