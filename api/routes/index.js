const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User, Class, Subject, Unit, SubUnit, Lesson, Content, Webmaster } = require('../models');

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
    console.log('[Upload] File filter checking:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });
    
    // Allow PDF, images, documents, text files, videos, and audio files
    const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        // Video formats
        'video/mp4', 'video/webm', 'video/ogg', 'video/3gpp', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
        // Audio formats - comprehensive support for ALL major formats
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 
        'audio/m4a', 'audio/m4b', 'audio/mp4', 'audio/flac', 
        'audio/webm', 'audio/3gpp', 'audio/3ga', 'audio/x-ms-wma',
        'audio/x-wav', 'audio/x-flac', 'audio/x-m4a', 'audio/x-aac',
        'audio/opus', 'audio/vnd.dolby.dd-raw', 'audio/vnd.dts', 'audio/vnd.dts.hd',
        'audio/basic', 'audio/vnd.au', 'audio/x-aiff', 'audio/x-gsm',
        'audio/mobile3gpp', 'audio/mobile3gpp2', 'audio/qcelp', 'audio/evrc'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        console.log('[Upload] File type accepted:', file.mimetype);
        cb(null, true);
    } else {
        console.log('[Upload] File type rejected:', file.mimetype);
        cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, images, documents, text files, videos, and audio files are allowed.`), false);
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
        console.log('[Upload] Upload request received:', {
            hasFile: !!req.file,
            fileInfo: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                filename: req.file.filename
            } : null,
            body: req.body
        });

        if (!req.file) {
            console.log('[Upload] No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { lessonId, type, title, metadata } = req.body;
        console.log('[Upload] Upload metadata:', { lessonId, type, title, metadata });

        if (!lessonId || !type || !title) {
            console.log('[Upload] Missing required fields:', { lessonId: !!lessonId, type: !!type, title: !!title });
            // Optimized cleanup with promise
            if (req.file && fs.existsSync(req.file.path)) {
                await fs.promises.unlink(req.file.path).catch(() => { });
            }
            return res.status(400).json({ message: 'Missing required fields: lessonId, type, title' });
        }

        // Special handling for audio files
        if (type === 'audio') {
            console.log('[Upload] Processing audio file:', {
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }

        // Find the actual lessonId from any hierarchy level
        let actualLessonId = lessonId;
        let hierarchyData = null;

        // Check if it's already a Lesson ID
        let lesson = await Lesson.findById(lessonId)
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
            // Check if it's a SubUnit ID
            const subUnit = await SubUnit.findById(lessonId)
                .populate({
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
                })
                .select('name');

            if (subUnit) {
                // Find lessons under this subUnit
                const lessons = await Lesson.find({ subUnitId: subUnit._id }).limit(1);
                if (lessons.length > 0) {
                    actualLessonId = lessons[0]._id;
                    lesson = await Lesson.findById(actualLessonId)
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
                }
            }
        }

        if (!lesson) {
            // Check if it's a Unit ID
            const unit = await Unit.findById(lessonId)
                .populate({
                    path: 'subjectId',
                    select: 'name classId',
                    populate: {
                        path: 'classId',
                        select: 'name'
                    }
                })
                .select('name');

            if (unit) {
                // Find subUnits under this unit
                const subUnits = await SubUnit.find({ unitId: unit._id }).limit(1);
                if (subUnits.length > 0) {
                    // Find lessons under this subUnit
                    const lessons = await Lesson.find({ subUnitId: subUnits[0]._id }).limit(1);
                    if (lessons.length > 0) {
                        actualLessonId = lessons[0]._id;
                        lesson = await Lesson.findById(actualLessonId)
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
                    }
                }
            }
        }

        if (!lesson) {
            await fs.promises.unlink(req.file.path).catch(() => { });
            
            // Try to provide helpful debug info about what went wrong
            let debugInfo = {
                providedId: lessonId,
                suggestion: 'Please ensure you are selecting a valid lesson, subUnit, or unit that has associated lessons.'
            };
            
            // Check if the provided ID format is valid
            if (!mongoose.Types.ObjectId.isValid(lessonId)) {
                debugInfo.error = 'Invalid ObjectId format';
                debugInfo.providedIdType = typeof lessonId;
                debugInfo.suggestion = 'The lessonId must be a valid MongoDB ObjectId (24 character hex string)';
            } else {
                debugInfo.error = 'No associated lessons found for this hierarchy ID';
                // Check what type of document this ID represents (if any)
                try {
                    const [Class, Subject, Unit, SubUnit, Lesson] = require('../models');
                    const [classDoc, subjectDoc, unitDoc, subUnitDoc, lessonDoc] = await Promise.all([
                        Class.findById(lessonId).select('_id name'),
                        Subject.findById(lessonId).select('_id name'),
                        Unit.findById(lessonId).select('_id name'),
                        SubUnit.findById(lessonId).select('_id name'),
                        Lesson.findById(lessonId).select('_id name')
                    ]);
                    
                    debugInfo.documentCheck = {
                        isClass: !!classDoc,
                        isSubject: !!subjectDoc,
                        isUnit: !!unitDoc,
                        isSubUnit: !!subUnitDoc,
                        isLesson: !!lessonDoc
                    };
                    
                    if (classDoc) debugInfo.foundClass = classDoc.name;
                    if (subjectDoc) debugInfo.foundSubject = subjectDoc.name;
                    if (unitDoc) debugInfo.foundUnit = unitDoc.name;
                    if (subUnitDoc) debugInfo.foundSubUnit = subUnitDoc.name;
                    if (lessonDoc) debugInfo.foundLesson = lessonDoc.name;
                } catch (checkError) {
                    debugInfo.checkError = checkError.message;
                }
            }
            
            return res.status(400).json({ 
                message: 'Invalid hierarchy ID. Could not find a valid lesson to associate with this content.',
                ...debugInfo
            });
        }

        // Flexible hierarchy extraction - handle different lesson structures
        let className, subjectName, unitName, subUnitName, lessonName;
        
        // Method 1: Standard hierarchy (lesson -> subUnit -> unit -> subject -> class)
        if (lesson?.subUnitId?.unitId?.subjectId?.classId?.name) {
            className = lesson.subUnitId.unitId.subjectId.classId.name;
            subjectName = lesson.subUnitId.unitId.subjectId.name;
            unitName = lesson.subUnitId.unitId.name;
            subUnitName = lesson.subUnitId.name;
            lessonName = lesson.name;
        } 
        // Method 2: Direct hierarchy (lesson -> unit -> subject -> class, no subUnit)
        else if (lesson?.unitId?.subjectId?.classId?.name) {
            className = lesson.unitId.subjectId.classId.name;
            subjectName = lesson.unitId.subjectId.name;
            unitName = lesson.unitId.name;
            subUnitName = ''; // No subUnit in this case
            lessonName = lesson.name;
        }
        // Method 3: Fetch missing hierarchy data if population failed
        else {
            // Get the populated lesson with all hierarchy info
            const populatedLesson = await Lesson.findById(lessonId)
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
                .populate({
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
                });

            if (populatedLesson?.subUnitId?.unitId?.subjectId?.classId?.name) {
                className = populatedLesson.subUnitId.unitId.subjectId.classId.name;
                subjectName = populatedLesson.subUnitId.unitId.subjectId.name;
                unitName = populatedLesson.subUnitId.unitId.name;
                subUnitName = populatedLesson.subUnitId.name;
                lessonName = populatedLesson.name;
            } else if (populatedLesson?.unitId?.subjectId?.classId?.name) {
                className = populatedLesson.unitId.subjectId.classId.name;
                subjectName = populatedLesson.unitId.subjectId.name;
                unitName = populatedLesson.unitId.name;
                subUnitName = '';
                lessonName = populatedLesson.name;
            }
        }

        // Validate required fields
        if (!className || !subjectName || !unitName) {
            console.error('Failed to extract hierarchy:', {
                className, subjectName, unitName,
                lessonId,
                hasSubUnit: !!lesson?.subUnitId,
                hasUnit: !!lesson?.unitId
            });
            await fs.promises.unlink(req.file.path).catch(() => { });
            return res.status(400).json({ 
                message: 'Failed to extract lesson hierarchy. Please check lesson structure.',
                debug: { className, subjectName, unitName, lessonId }
            });
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

        // Safe string operations with fallbacks
        const cleanClassName = fastClean(className || 'UnknownClass');
        const cleanSubjectName = fastClean(subjectName || 'UnknownSubject');
        let cleanUnitName = fastClean(unitName || 'UnknownUnit');

        // Fast unit name formatting
        if (/^\d+$/.test(cleanUnitName)) {
            cleanUnitName = `Unit ${cleanUnitName}`;
        }

        // Cached resource folder mapping for faster lookups
        const resourceFolderMap = {
            'book': 'Books', 'flashcard': 'Flashcards', 'notes': 'Notes', 'qa': 'QA',
            'quiz': 'Quizzes', 'activity': 'Activities', 'extra': 'Extras', 'video': 'Videos',
            'audio': 'Audios', 'worksheet': 'Worksheets', 'questionPaper': 'Question_Papers', 'slide': 'Slides'
        };

        const resourceFolder = resourceFolderMap[type] || 'Others';

        // Generate relative path in the format: ../uploads/Class/subject/unit/filename.ext
        const cleanSubjectNameLower = cleanSubjectName.toLowerCase().replace(/\s+/g, '');
        const cleanUnitNameFormatted = cleanUnitName.replace(/\s+/g, '');
        const cleanFileName = fastClean(req.file.originalname).replace(/\.[^/.]+$/, '');
        const fileExtension = path.extname(req.file.originalname);
        const relativeFileName = `${cleanFileName}${fileExtension}`;
        
        // Create the uploads directory structure and relative path
        const uploadsPath = path.join(__dirname, '../../uploads', cleanClassName, cleanSubjectNameLower, cleanUnitNameFormatted, resourceFolder);
        const relativeFilePath = `uploads/${cleanClassName}/${cleanSubjectNameLower}/${cleanUnitNameFormatted}/${resourceFolder}/${relativeFileName}`;

        // Optimized directory creation with promise-based operations
        await fs.promises.mkdir(uploadsPath, { recursive: true });

        // Move the uploaded file to the new location
        const newFilePath = path.join(uploadsPath, relativeFileName);
        console.log('[Upload] Moving file to:', newFilePath);

        // Robust file move: try rename, fallback to copy+unlink for cross-device issues
        try {
            await fs.promises.rename(req.file.path, newFilePath);
            console.log('[Upload] File moved successfully');
        } catch (renameError) {
            if (renameError.code === 'EXDEV') {
                console.log('[Upload] Cross-device move, using copy+unlink');
                // Cross-device link not permitted, copy and unlink instead
                await fs.promises.copyFile(req.file.path, newFilePath);
                await fs.promises.unlink(req.file.path);
                console.log('[Upload] File copied and original removed');
            } else {
                throw renameError;
            }
        }

        // Create content record with absolute file path for reliable access
        const contentData = {
            lessonId: new mongoose.Types.ObjectId(actualLessonId),
            type: type,
            title: title,
            body: '', // Don't store metadata in body for file uploads
            filePath: newFilePath,
            originalFileName: req.file.originalname,
            fileSize: req.file.size,
            metadata: {
                ...(metadata ? JSON.parse(metadata) : {}),
                hierarchyPath: `../uploads/${cleanClassName}/${cleanSubjectNameLower}/${cleanUnitNameFormatted}/${resourceFolder}`,
                className: cleanClassName,
                subjectName: cleanSubjectName,
                unitName: cleanUnitName,
                subUnitName: subUnitName,
                lessonName: lessonName,
                resourceFolder: resourceFolder,
                relativePath: relativeFilePath,
                originalId: lessonId, // Store the original ID that was passed
                actualLessonId: actualLessonId // Store the actual lesson ID used
            }
        };

        console.log('[Upload] Creating content record:', {
            type: contentData.type,
            title: contentData.title,
            filePath: contentData.filePath,
            fileSize: contentData.fileSize
        });

        const newContent = new Content(contentData);
        await newContent.save();
        console.log('[Upload] Content record saved successfully:', newContent._id);



        const response = {
            success: true,
            content: newContent,
            fileInfo: {
                filename: relativeFileName,
                originalName: req.file.originalname,
                size: req.file.size,
                path: relativeFilePath,
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
        };
        
        console.log('[Upload] Upload completed successfully:', {
            contentId: newContent._id,
            type: type,
            filename: relativeFileName,
            size: req.file.size
        });
        
        res.status(201).json(response);
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
        console.log('[API /content/:id/file] Request received:', {
            contentId: req.params.id,
            userAgent: req.headers['user-agent'],
            referer: req.headers.referer
        });

        const content = await Content.findById(req.params.id);
        if (!content) {
            console.log('[API /content/:id/file] Content not found in database:', req.params.id);
            return res.status(404).json({ message: 'Content not found in database', contentId: req.params.id });
        }

        if (!content.filePath) {
            console.log('[API /content/:id/file] No filePath in content:', {
                contentId: req.params.id,
                contentType: content.type,
                title: content.title
            });
            return res.status(404).json({ 
                message: 'No file path associated with this content', 
                contentId: req.params.id,
                contentType: content.type,
                hasFilePath: false
            });
        }

        // Use the stored file path directly (now it's an absolute path)
        const fullFilePath = content.filePath;
        
        console.log('[API /content/:id/file] Serving file:', {
            contentId: req.params.id,
            contentType: content.type,
            title: content.title,
            originalFileName: content.originalFileName,
            filePath: content.filePath,
            fullPath: fullFilePath,
            exists: fs.existsSync(fullFilePath),
            fileSize: fs.existsSync(fullFilePath) ? fs.statSync(fullFilePath).size : null
        });

        if (!fs.existsSync(fullFilePath)) {
            console.error('[API /content/:id/file] File not found on server:', fullFilePath);
            return res.status(404).json({ 
                message: 'File not found on server', 
                contentId: req.params.id,
                filePath: content.filePath,
                fullPath: fullFilePath
            });
        }

        const finalPath = fullFilePath;

        // Set appropriate content type based on file extension
        const ext = path.extname(finalPath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.avi': 'video/avi',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            // Audio formats - comprehensive support for ALL major formats
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
            '.m4a': 'audio/mp4',
            '.m4b': 'audio/mp4',
            '.flac': 'audio/flac',
            '.opus': 'audio/ogg',
            '.webm': 'audio/webm',
            '.3gp': 'audio/3gpp',
            '.3ga': 'audio/3gpp',
            '.wma': 'audio/x-ms-wma',
            '.aiff': 'audio/x-aiff',
            '.au': 'audio/basic',
            '.gsm': 'audio/x-gsm',
            '.ra': 'audio/vnd.rn-realaudio',
            '.rm': 'audio/vnd.rn-realaudio'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        console.log('[API /content/:id/file] Serving with content type:', contentType, 'for extension:', ext);

        res.setHeader('Content-Type', contentType);

        // Handle range requests for video/audio seeking
        const stat = fs.statSync(finalPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        console.log('[API /content/:id/file] File details:', {
            path: finalPath,
            size: fileSize,
            range: range,
            contentType: contentType
        });

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(finalPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            };
            res.writeHead(206, head);
            file.pipe(res);
            console.log('[API /content/:id/file] Range request served:', { start, end, chunksize });
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': contentType,
            };
            res.writeHead(200, head);
            fs.createReadStream(finalPath).pipe(res);
            console.log('[API /content/:id/file] Full file served:', { fileSize, contentType });
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
        if (content.filePath) {
            const fullFilePath = content.filePath.startsWith(path.sep) ? 
                content.filePath : 
                path.resolve(__dirname, '../../', content.filePath);
            
            if (fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('[API /content/:id] File deleted:', fullFilePath);
            }
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

// --- Webmaster Auth Route ---
router.post('/auth/webmaster-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Webmaster login attempt:', { username, password });

        const webmaster = await Webmaster.findOne({ username });
        console.log('Webmaster found:', webmaster);

        if (!webmaster || !bcrypt.compareSync(password, webmaster.password)) {
            console.log('Webmaster password mismatch:', { expected: webmaster?.password ? 'hashed' : 'none', received: password });
            return res.status(401).json({ message: 'Invalid webmaster credentials' });
        }

        const token = `webmaster-token-${webmaster._id}`;
        const { password: _, ...webmasterWithoutPass } = webmaster.toObject();
        res.json({ webmaster: webmasterWithoutPass, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Collection Management Routes ---
// Get all collections except webmaster
router.get('/collections/list', async (req, res) => {
    try {
        const collections = [
            { name: 'users', displayName: 'பயனர்கள் (Users)', count: await User.countDocuments() },
            { name: 'classes', displayName: 'வகுப்புகள் (Classes)', count: await Class.countDocuments() },
            { name: 'subjects', displayName: 'பாடங்கள் (Subjects)', count: await Subject.countDocuments() },
            { name: 'units', displayName: 'அலகுகள் (Units)', count: await Unit.countDocuments() },
            { name: 'subunits', displayName: 'துணை அலகுகள் (Sub Units)', count: await SubUnit.countDocuments() },
            { name: 'lessons', displayName: 'பாடங்கள் (Lessons)', count: await Lesson.countDocuments() },
            { name: 'contents', displayName: 'உள்ளடக்கங்கள் (Contents)', count: await Content.countDocuments() }
        ];

        res.json(collections);
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Export collection data
router.get('/collections/export/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;

        let data = [];
        switch (collectionName) {
            case 'users':
                data = await User.find().select('-password');
                break;
            case 'classes':
                data = await Class.find();
                break;
            case 'subjects':
                data = await Subject.find();
                break;
            case 'units':
                data = await Unit.find();
                break;
            case 'subunits':
                data = await SubUnit.find();
                break;
            case 'lessons':
                data = await Lesson.find();
                break;
            case 'contents':
                data = await Content.find();
                break;
            default:
                return res.status(400).json({ message: 'Invalid collection name' });
        }

        const exportData = {
            collectionName,
            exportDate: new Date().toISOString(),
            recordCount: data.length,
            data: data.map(item => ({
                ...item.toObject(),
                _id: item._id.toString()
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${collectionName}_export_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting collection:', error);
        res.status(500).json({ message: error.message });
    }
});

// Import collection data
router.post('/collections/import/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const { data } = req.body;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Invalid import data format' });
        }

        let result = { inserted: 0, updated: 0, errors: 0 };

        for (const item of data) {
            try {
                // Remove _id if present to avoid conflicts
                const { _id, ...itemData } = item;
                
                switch (collectionName) {
                    case 'users':
                        await User.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'classes':
                        await Class.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'subjects':
                        await Subject.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'units':
                        await Unit.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'subunits':
                        await SubUnit.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'lessons':
                        await Lesson.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    case 'contents':
                        await Content.updateOne({ _id }, itemData, { upsert: true });
                        break;
                    default:
                        result.errors++;
                        continue;
                }
                result.inserted++;
            } catch (error) {
                console.error('Error importing item:', error);
                result.errors++;
            }
        }

        res.json({
            success: true,
            message: `Import completed for ${collectionName}`,
            result
        });
    } catch (error) {
        console.error('Error importing collection:', error);
        res.status(500).json({ message: error.message });
    }
});

// Clear collection data
router.delete('/collections/clear/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;

        let result = { 
            deleted: 0,
            existed: false,
            collectionName: collectionName
        };

        // First check if collection exists and has documents
        let documentCount = 0;
        let deleteResult;

        switch (collectionName) {
            case 'users':
                documentCount = await User.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await User.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'classes':
                documentCount = await Class.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await Class.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'subjects':
                documentCount = await Subject.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await Subject.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'units':
                documentCount = await Unit.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await Unit.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'subunits':
                documentCount = await SubUnit.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await SubUnit.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'lessons':
                documentCount = await Lesson.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await Lesson.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            case 'contents':
                documentCount = await Content.countDocuments();
                result.existed = documentCount > 0;
                if (result.existed) {
                    deleteResult = await Content.deleteMany({});
                    result.deleted = deleteResult.deletedCount;
                }
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: `Invalid collection name: ${collectionName}`,
                    validCollections: ['users', 'classes', 'subjects', 'units', 'subunits', 'lessons', 'contents']
                });
        }

        // Return appropriate response based on whether collection had documents
        if (!result.existed) {
            return res.json({
                success: true,
                message: `${collectionName} collection was already empty`,
                result,
                info: `No documents were found in the ${collectionName} collection`
            });
        } else {
            return res.json({
                success: true,
                message: `${collectionName} collection cleared successfully`,
                result,
                info: `Successfully deleted ${result.deleted} document(s) from ${collectionName} collection`
            });
        }
    } catch (error) {
        console.error('Error clearing collection:', error);
        return res.status(500).json({ 
            success: false,
            message: `Failed to clear ${collectionName} collection`,
            error: error.message 
        });
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

        // Apply size validation to content types that might contain large files
        const contentTypesWithFileSizeLimit = ['book', 'video', 'audio', 'worksheet', 'slide', 'questionPaper'];
        if (contentTypesWithFileSizeLimit.includes(req.body.type)) {
            const bodySize = req.body.body ? Buffer.byteLength(req.body.body, 'utf8') : 0;
            const maxSize = 12 * 1024 * 1024; // 12MB to ensure BSON document size stays under 16MB

            if (bodySize > maxSize) {
                const sizeMB = (bodySize / (1024 * 1024)).toFixed(2);
                return res.status(400).json({
                    message: `File is too large (${sizeMB}MB). Maximum size is 12MB. Please use a smaller file or upload as a file instead.`,
                    error: 'FILE_TOO_LARGE',
                    maxSize: '12MB'
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
        
        // Handle specific BSON document size errors
        if (error.name === 'BSONError' || error.code === 'ERR_OUT_OF_RANGE' || 
            error.message.includes('offset') || error.message.includes('range')) {
            return res.status(413).json({
                message: 'Content is too large to save. Please use a smaller file or upload as a file instead.',
                error: 'CONTENT_TOO_LARGE',
                suggestion: 'Try reducing the file size or use the file upload feature for large files.'
            });
        }
        
        // Handle MongoDB document size limit errors
        if (error.message && error.message.includes('Document too large')) {
            return res.status(413).json({
                message: 'Content exceeds MongoDB size limits. Please use a smaller file or upload as a file instead.',
                error: 'DOCUMENT_TOO_LARGE',
                suggestion: 'Try reducing the file size or use the file upload feature for large files.'
            });
        }
        
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
        if (content.filePath) {
            const fullFilePath = content.filePath;
            
            if (fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('[API /content/:id] File deleted:', fullFilePath);
            } else {
                console.log('[API /content/:id] File not found for deletion:', fullFilePath);
            }
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

