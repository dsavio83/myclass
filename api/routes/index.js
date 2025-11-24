const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { User, Class, Subject, Unit, SubUnit, Lesson, Content } = require('../models');

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads');
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + extension;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow PDF, images, documents, text files, videos, and audio files
    const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'video/mp4', 'video/webm', 'video/ogg',
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/webm'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, images, documents, text files, videos, and audio files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

// --- File Upload Routes ---
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { lessonId, type, title, metadata } = req.body;

        if (!lessonId || !type || !title) {
            // Optimized cleanup with promise
            if (req.file && fs.existsSync(req.file.path)) {
                await fs.promises.unlink(req.file.path).catch(() => { });
            }
            return res.status(400).json({ message: 'Missing required fields: lessonId, type, title' });
        }

        // Optimized single query to get hierarchy information
        const lesson = await Lesson.findById(lessonId)
            .populate({
                path: 'subUnitId',
                select: 'name unitId',
                populate: {
                    path: 'unitId',
                    select: 'name subjectId',
                    populate: {
                        path: 'subjectId',
                        select: 'name classId',
                        populate: {
                            path: 'classId',
                            select: 'name'
                        }
                    }
                }
            })
            .select('name');

        if (!lesson) {
            await fs.promises.unlink(req.file.path).catch(() => { });
            return res.status(400).json({ message: 'Invalid lessonId' });
        }

        // Fast validation and extraction
        const className = lesson?.subUnitId?.unitId?.subjectId?.classId?.name;
        const subjectName = lesson?.subUnitId?.unitId?.subjectId?.name;
        const unitName = lesson?.subUnitId?.unitId?.name;
        const subUnitName = lesson?.subUnitId?.name;
        const lessonName = lesson?.name;

        // Quick validation with early return
        if (!className || !subjectName || !unitName) {
            await fs.promises.unlink(req.file.path).catch(() => { });
            return res.status(400).json({ message: 'Incomplete lesson hierarchy structure' });
        }

        // Optimized string cleaning - use faster character filtering
        const fastClean = (str) => {
            if (!str) return '';
            let result = '';
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
                    (char >= '0' && char <= '9') || char === ' ' || char === '-') {
                    result += char;
                }
            }
            return result.trim();
        };

        // Fast string operations
        const cleanClassName = fastClean(className);
        const cleanSubjectName = fastClean(subjectName);
        let cleanUnitName = fastClean(unitName);

        // Fast unit name formatting
        if (/^\d+$/.test(cleanUnitName)) {
            cleanUnitName = `Unit ${cleanUnitName}`;
        }

        // Cached resource folder mapping for faster lookups
        const resourceFolderMap = {
            'book': 'Books', 'flashcard': 'Flashcards', 'notes': 'Notes', 'qa': 'QA',
            'quiz': 'Quizzes', 'activity': 'Activities', 'extra': 'Extras', 'video': 'Videos',
            'audio': 'Audios', 'worksheet': 'Worksheets', 'questionPaper': 'Question_Papers'
        };

        const resourceFolder = resourceFolderMap[type] || 'Others';

        // Optimized path creation and file operations
        const uploadPath = path.join(__dirname, '../../uploads', cleanClassName, cleanSubjectName, cleanUnitName, resourceFolder);

        // Optimized directory creation with promise-based operations
        await fs.promises.mkdir(uploadPath, { recursive: true });

        // Move the uploaded file to the new location
        const newFilePath = path.join(uploadPath, req.file.filename);

        // Robust file move: try rename, fallback to copy+unlink for cross-device issues
        try {
            await fs.promises.rename(req.file.path, newFilePath);
        } catch (renameError) {
            if (renameError.code === 'EXDEV') {
                // Cross-device link not permitted, copy and unlink instead
                await fs.promises.copyFile(req.file.path, newFilePath);
                await fs.promises.unlink(req.file.path);
            } else {
                throw renameError;
            }
        }

        // Create content record with file information
        const contentData = {
            lessonId: new mongoose.Types.ObjectId(lessonId),
            type: type,
            title: title,
            body: metadata ? JSON.stringify(metadata) : '',
            filePath: newFilePath,
            originalFileName: req.file.originalname,
            fileSize: req.file.size,
            metadata: {
                ...(metadata ? JSON.parse(metadata) : {}),
                hierarchyPath: `${cleanClassName}/${cleanSubjectName}/${cleanUnitName}/${resourceFolder}`,
                className: cleanClassName,
                subjectName: cleanSubjectName,
                unitName: cleanUnitName,
                subUnitName: subUnitName,
                lessonName: lessonName,
                resourceFolder: resourceFolder
            }
        };

        const newContent = new Content(contentData);
        await newContent.save();

        res.status(201).json({
            success: true,
            content: newContent,
            fileInfo: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: newFilePath,
                hierarchyPath: contentData.metadata.hierarchyPath,
                hierarchy: {
                    className: cleanClassName,
                    subjectName: cleanSubjectName,
                    unitName: cleanUnitName,
                    subUnitName: subUnitName,
                    lessonName: lessonName,
                    resourceFolder: resourceFolder
                }
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        console.error('Stack:', error.stack); // Log full stack trace
        // Optimized cleanup with promise-based operation
        if (req.file && fs.existsSync(req.file.path)) {
            await fs.promises.unlink(req.file.path).catch(() => { });
        }
        res.status(500).json({ message: `Upload failed: ${error.message}` });
    }
});

// Serve uploaded files
router.get('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../../uploads', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.sendFile(filePath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Serve file by content ID (handles hierarchical paths)
router.get('/content/:id/file', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content || !content.filePath) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (!fs.existsSync(content.filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set appropriate content type based on file extension
        const ext = path.extname(content.filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Handle range requests for video seeking
        const stat = fs.statSync(content.filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(content.filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': contentType,
            };
            res.writeHead(200, head);
            fs.createReadStream(content.filePath).pipe(res);
        }
    } catch (error) {
        console.error('File serve error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete uploaded file and content record
router.delete('/content/:id', async (req, res) => {
    try {
        const contentId = req.params.id;

        // Find the content record first
        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Delete file from filesystem if it exists
        if (content.filePath && fs.existsSync(content.filePath)) {
            fs.unlinkSync(content.filePath);
        }

        // Delete the content record from database
        await Content.findByIdAndDelete(contentId);

        res.json({
            success: true,
            message: 'File and content deleted successfully',
            deletedContent: {
                id: content._id,
                title: content.title,
                type: content.type,
                filePath: content.filePath
            }
        });
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete file by filename only (without database record)
router.delete('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../../uploads', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete the file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'File deleted successfully',
            deletedFile: filename
        });
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- Auth Routes ---
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username, password }); // DEBUG LOG

        // In a real app, use bcrypt to compare hashed passwords
        const user = await User.findOne({ username });
        console.log('User found:', user); // DEBUG LOG

        if (!user || user.password !== password) { // Simple comparison for now as per mock
            console.log('Password mismatch:', { expected: user?.password, received: password }); // DEBUG LOG
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = `mock-token-${user._id}`; // Replace with JWT in production
        const { password: _, ...userWithoutPass } = user.toObject();
        res.json({ user: userWithoutPass, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- User Routes ---
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        const { password, ...userWithoutPass } = newUser.toObject();
        res.status(201).json(userWithoutPass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profile update route for first-time login
router.put('/users/:id/profile', async (req, res) => {
    try {
        const { password, mobileNumber } = req.body;

        if (!password || !mobileNumber) {
            return res.status(400).json({
                message: 'Password and mobile number are required'
            });
        }

        // Validate password length
        if (password.length < 3) {
            return res.status(400).json({
                message: 'Password must be at least 3 characters long'
            });
        }

        // Update user with new password, mobile number, and set isFirstLogin to false
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                password,
                mobileNumber,
                isFirstLogin: false
            },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Profile update route for general profile updates (name, email, mobile)
router.put('/users/:id/update-profile', async (req, res) => {
    try {
        const { name, email, mobileNumber } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                message: 'Name and email are required'
            });
        }

        // Update user profile information
        const updateData = { name, email };
        if (mobileNumber) {
            updateData.mobileNumber = mobileNumber;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            user: updatedUser,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Password change route
router.put('/users/:id/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: 'Current password, new password, and confirm password are required'
            });
        }

        // Validate password length
        if (newPassword.length < 3) {
            return res.status(400).json({
                message: 'New password must be at least 3 characters long'
            });
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: 'New passwords do not match'
            });
        }

        // Find user and verify current password
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password (simple comparison for now)
        if (user.password !== currentPassword) {
            return res.status(401).json({
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user profile
router.get('/users/:id/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- Hierarchy Routes (Generic Handler) ---
const createCrudRoutes = (Model, routeName, parentField = null) => {
    router.get(`/${routeName}`, async (req, res) => {
        try {
            const query = {};
            if (parentField && req.query[parentField]) {
                query[parentField] = req.query[parentField];
            }
            const items = await Model.find(query);
            res.json(items);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    router.post(`/${routeName}`, async (req, res) => {
        try {
            const newItem = new Model(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    router.put(`/${routeName}/:id`, async (req, res) => {
        try {
            const updatedItem = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json(updatedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    router.delete(`/${routeName}/:id`, async (req, res) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            // Note: Cascading deletes should be handled here or in pre-remove hooks
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
};

createCrudRoutes(Class, 'classes');
createCrudRoutes(Subject, 'subjects', 'classId');
createCrudRoutes(Unit, 'units', 'subjectId');
createCrudRoutes(SubUnit, 'subUnits', 'unitId');
createCrudRoutes(Lesson, 'lessons', 'subUnitId');

// --- Content Routes ---
// Updated to always return grouped format for consistency across all views  
router.get('/content', async (req, res) => {
    try {
        const { lessonId, type } = req.query;

        // Debug logging
        console.log('[API /content] Request:', { lessonId, type });

        // Convert lessonId to ObjectId for proper filtering
        const query = {
            lessonId: lessonId ? new mongoose.Types.ObjectId(lessonId) : undefined
        };

        // Remove undefined values from query
        if (!query.lessonId) {
            delete query.lessonId;
        }

        if (type) query.type = type;

        console.log('[API /content] Query:', query);

        const contents = await Content.find(query);

        console.log('[API /content] Found', contents.length, 'items');
        console.log('[API /content] Items:', contents.map(c => ({
            id: c._id,
            type: c.type,
            title: c.title,
            body: c.body
        })));

        // Always return grouped format for consistency
        const grouped = contents.reduce((acc, content) => {
            if (!acc[content.type]) {
                acc[content.type] = { type: content.type, count: 0, docs: [] };
            }
            acc[content.type].docs.push(content);
            acc[content.type].count++;
            return acc;
        }, {});

        const result = Object.values(grouped);
        console.log('[API /content] Returning grouped:', result.map(g => ({ type: g.type, count: g.count })));
        return res.json(result);
    } catch (error) {
        console.error('[API /content] Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Flashcard-specific endpoint
router.get('/flashcards/:lessonId', async (req, res) => {
    try {
        const { lessonId } = req.params;
        console.log('[API /flashcards] Request for lessonId:', lessonId);
        console.log('[API /flashcards] LessonId type:', typeof lessonId);

        // Validate lessonId format
        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
            console.log('[API /flashcards] Invalid ObjectId format');
            return res.status(400).json({
                success: false,
                message: 'Invalid lessonId format',
                lessonId
            });
        }

        const flashcards = await Content.find({
            lessonId: new mongoose.Types.ObjectId(lessonId),
            type: 'flashcard'
        });

        console.log('[API /flashcards] Found', flashcards.length, 'flashcards');
        console.log('[API /flashcards] Flashcard IDs:', flashcards.map(f => f._id));

        res.json({
            success: true,
            lessonId,
            count: flashcards.length,
            flashcards: flashcards
        });
    } catch (error) {
        console.error('[API /flashcards] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            lessonId: req.params.lessonId
        });
    }
});

// Q&A-specific endpoint with enhanced features
router.get('/qa/:lessonId', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { questionType, cognitiveProcess, marks, limit, skip } = req.query;

        console.log('[API /qa] Request for lessonId:', lessonId);
        console.log('[API /qa] Filters:', { questionType, cognitiveProcess, marks, limit, skip });

        // Validate lessonId format
        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lessonId format',
                lessonId
            });
        }

        // Build query
        const query = {
            lessonId: new mongoose.Types.ObjectId(lessonId),
            type: 'qa'
        };

        // Add optional filters
        if (questionType) {
            query['metadata.questionType'] = questionType;
        }
        if (cognitiveProcess) {
            query['metadata.cognitiveProcess'] = cognitiveProcess;
        }
        if (marks) {
            query['metadata.marks'] = Number(marks);
        }

        // Build options
        const options = {};
        if (limit) options.limit = Number(limit);
        if (skip) options.skip = Number(skip);

        const qaItems = await Content.find(query, null, options);

        // Get total count for pagination
        const totalCount = await Content.countDocuments(query);

        console.log('[API /qa] Found', qaItems.length, 'Q&A items (total:', totalCount, ')');

        res.json({
            success: true,
            lessonId,
            count: qaItems.length,
            totalCount,
            qa: qaItems,
            filters: {
                questionType: questionType || null,
                cognitiveProcess: cognitiveProcess || null,
                marks: marks ? Number(marks) : null,
                limit: limit ? Number(limit) : null,
                skip: skip ? Number(skip) : null
            }
        });
    } catch (error) {
        console.error('[API /qa] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            lessonId: req.params.lessonId
        });
    }
});

// Get Q&A statistics for a lesson
router.get('/qa/:lessonId/stats', async (req, res) => {
    try {
        const { lessonId } = req.params;

        console.log('[API /qa/stats] Request for lessonId:', lessonId);

        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lessonId format',
                lessonId
            });
        }

        // Aggregate Q&A statistics
        const stats = await Content.aggregate([
            {
                $match: {
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    type: 'qa'
                }
            },
            {
                $group: {
                    _id: null,
                    totalQA: { $sum: 1 },
                    avgMarks: { $avg: '$metadata.marks' },
                    questionTypes: { $addToSet: '$metadata.questionType' },
                    cognitiveProcesses: { $addToSet: '$metadata.cognitiveProcess' },
                    marksDistribution: {
                        $push: {
                            marks: '$metadata.marks',
                            count: 1
                        }
                    }
                }
            }
        ]);

        // Get marks distribution
        const marksStats = await Content.aggregate([
            {
                $match: {
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    type: 'qa'
                }
            },
            {
                $group: {
                    _id: '$metadata.marks',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const result = stats[0] || {
            totalQA: 0,
            avgMarks: 0,
            questionTypes: [],
            cognitiveProcesses: [],
            marksDistribution: []
        };

        res.json({
            success: true,
            lessonId,
            stats: {
                totalQA: result.totalQA || 0,
                avgMarks: result.avgMarks || 0,
                questionTypes: result.questionTypes || [],
                cognitiveProcesses: result.cognitiveProcesses || [],
                marksDistribution: marksStats
            }
        });
    } catch (error) {
        console.error('[API /qa/stats] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            lessonId: req.params.lessonId
        });
    }
});

router.post('/content', async (req, res) => {
    try {
        console.log('[API] Content creation request:', {
            type: req.body.type,
            title: req.body.title?.substring(0, 100) + '...',
            bodyLength: req.body.body?.length || 0,
            lessonId: req.body.lessonId
        });

        // Only apply size validation to specific file types (not for regular content like flashcards)
        const contentTypesWithFileSizeLimit = ['book', 'video', 'audio', 'worksheet'];
        if (contentTypesWithFileSizeLimit.includes(req.body.type)) {
            const bodySize = req.body.body ? Buffer.byteLength(req.body.body, 'utf8') : 0;
            const maxSize = 15 * 1024 * 1024; // 15MB to be safe (16MB is hard limit)

            if (bodySize > maxSize) {
                const sizeMB = (bodySize / (1024 * 1024)).toFixed(2);
                return res.status(400).json({
                    message: `File is too large (${sizeMB}MB). Maximum size is 15MB. Please use a smaller file.`
                });
            }
        }

        // Ensure lessonId is properly converted to ObjectId
        const contentData = {
            ...req.body,
            lessonId: new mongoose.Types.ObjectId(req.body.lessonId)
        };

        console.log('[API] Content data to save:', {
            ...contentData,
            title: contentData.title?.substring(0, 100) + '...',
            body: contentData.body?.substring(0, 100) + '...'
        });

        const newContent = new Content(contentData);
        await newContent.save();
        console.log('[API] Content saved successfully:', newContent._id);
        res.status(201).json(newContent);
    } catch (error) {
        console.error('[API] Content creation error:', error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/content/:id', async (req, res) => {
    try {
        const updatedContent = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedContent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/content/:id', async (req, res) => {
    try {
        const contentId = req.params.id;

        // Find the content record first to get file path
        const content = await Content.findById(contentId);
        if (!content) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Delete file from filesystem if it exists
        if (content.filePath && fs.existsSync(content.filePath)) {
            fs.unlinkSync(content.filePath);
        }

        // Delete the content record from database
        await Content.findByIdAndDelete(contentId);

        res.json({
            success: true,
            message: 'Content and associated file deleted successfully',
            deletedContent: {
                id: content._id,
                title: content.title,
                type: content.type,
                filePath: content.filePath
            }
        });
    } catch (error) {
        console.error('Content deletion error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Increment view count
router.post('/content/:id/view', async (req, res) => {
    try {
        const content = await Content.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        );
        if (!content) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.json({ success: true, viewCount: content.viewCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Stats Route ---
router.get('/stats', async (req, res) => {
    try {
        const [
            classCount, subjectCount, unitCount, subUnitCount, lessonCount, contentCount, userCount,
            adminCount, teacherCount, studentCount, contentByType
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
            User.countDocuments({ role: 'student' }),
            Content.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }])
        ]);

        const resourceCounts = contentByType.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        res.json({
            classCount, subjectCount, unitCount, subUnitCount, lessonCount, contentCount, userCount,
            adminCount, teacherCount, studentCount,
            contentByType: resourceCounts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
