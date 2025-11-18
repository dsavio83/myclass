import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // Determine upload path based on file type
    switch (file.mimetype) {
      case 'application/pdf':
        uploadPath = 'uploads/pdfs';
        break;
      case 'video/mp4':
      case 'video/mpeg':
      case 'video/quicktime':
      case 'video/x-msvideo': // .avi
      case 'video/webm':
        uploadPath = 'uploads/videos';
        break;
      case 'audio/mpeg': // .mp3
      case 'audio/wav':
      case 'audio/x-wav':
      case 'audio/ogg':
      case 'audio/x-m4a':
        uploadPath = 'uploads/audio';
        break;
      default:
        return cb(new Error('Unsupported file type'), false);
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    // Get the default filename from request body or generate one
    const defaultName = req.body.defaultFilename || 'uploaded_file';
    const extension = path.extname(file.originalname);
    const timestamp = Date.now();
    
    // Clean filename: remove special characters and spaces
    const cleanName = defaultName
      .toString()
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const filename = `${cleanName}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    // PDFs
    'application/pdf',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/x-m4a'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Export middleware functions for different scenarios
export const singleFileUpload = upload.single('file');
export const multipleFileUpload = upload.array('files', 10);
export const uploadMiddleware = upload;

// Helper function to generate default filenames
export const generateDefaultFilename = (className, chapterName, lessonName, fileExtension) => {
  const parts = [className, chapterName, lessonName]
    .filter(part => part && part.trim())
    .map(part => part.trim());
  
  const cleanParts = parts.map(part => 
    part.toString().replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/_+/g, '_')
  );
  
  return `${cleanParts.join('_')}${fileExtension}`;
};

export default upload;