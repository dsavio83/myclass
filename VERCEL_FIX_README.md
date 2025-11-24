# Vercel Serverless Function Size Fix

## Problem
The serverless function exceeded Vercel's 250 MB unzipped size limit due to:
- Frontend dependencies being bundled with the serverless function
- Large route files with file upload handling
- Inefficient bundling of all project files

## Solution

### 1. Separated Concerns
- Created minimal serverless function (`api/index.js`)
- Removed frontend dependencies from API bundle
- Optimized routes to only include essential functionality

### 2. Key Changes Made

#### vercel.json
- Added proper function configuration
- Configured memory limits and timeouts
- Added Node.js memory optimization

#### .vercelignore
- Excluded frontend files from serverless bundle
- Prevents unnecessary files from being included

#### api/index.js
- Streamlined to ~100 lines (down from 1000+)
- Removed file upload handling
- Simplified route handlers
- Optimized database connections

#### api/package.json
- Removed unnecessary dependencies:
  - `axios` (not needed)
  - `form-data` (file uploads handled externally)
  - `multer` (file uploads handled externally)

#### api/models.js
- Optimized schemas
- Added database indexes for better performance
- Streamlined to only essential models

### 3. File Upload Handling

⚠️ **Important**: File uploads are no longer handled directly in serverless functions due to Vercel's limitations.

#### Recommended Solutions:

1. **Vercel Blob Storage** (Recommended)
   ```javascript
   // Example implementation
   import { put } from '@vercel/blob';
   
   export default async function handler(req, res) {
     const formData = await req.formData();
     const file = formData.get('file');
     
     const { url } = await put(file.name, file, { access: 'public' });
     
     res.json({ fileUrl: url });
   }
   ```

2. **AWS S3**
   - Upload files to S3 bucket
   - Store file URLs in database
   - Use signed URLs for secure access

3. **Cloudinary** (Image/Video optimized)
   - Upload directly to Cloudinary
   - Automatic optimization and CDN
   - Store metadata in database

### 4. Deployment Steps

1. **Install dependencies**:
   ```bash
   cd api && npm install
   ```

2. **Configure environment variables**:
   ```
   MONGODB_URI=your_mongodb_connection_string
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

### 5. Testing the Fix

Check function size:
```bash
vercel inspect <deployment-url>/api/index.js
```

Expected size: < 50 MB (well under 250 MB limit)

### 6. What Was Removed

- File upload endpoints (use external storage)
- Complex file system operations
- Unused dependencies
- Frontend components and assets
- Development dependencies in production

### 7. What's Kept

- Authentication endpoints
- User management
- Content CRUD operations
- Basic database operations
- Statistics endpoints

### 8. Migration Guide

If you need file uploads:
1. Choose external storage provider
2. Update frontend to upload directly to storage
3. Store file URLs in existing `Content` model
4. Remove `filePath`, `fileSize` fields if needed

### 9. Performance Improvements

- Faster cold starts
- Reduced memory usage
- Better scalability
- Lower deployment times

## Next Steps

1. Test deployment
2. Implement external file storage if needed
3. Update frontend to handle new file upload flow
4. Monitor function performance and size

For more information, see [Vercel's Serverless Function Documentation](https://vercel.com/docs/concepts/functions/serverless-functions).