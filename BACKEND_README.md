# Learning Platform Backend API

A comprehensive Node.js/Express backend with MongoDB for a Learning Platform Content Browser application.

## 🚀 Features

- **Authentication System**: JWT-based authentication with role-based access control
- **Course Structure Management**: Complete CRUD operations for classes, subjects, units, sub-units, and lessons
- **Content Management**: Support for multiple content types (notes, videos, quizzes, books, etc.)
- **User Management**: Admin panel for managing users with different roles
- **Database**: MongoDB with cascading deletes for hierarchical data
- **API Documentation**: RESTful endpoints with proper error handling

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   ├── User.js              # User model with authentication
│   ├── Class.js             # Class model
│   ├── Subject.js           # Subject model
│   ├── Unit.js              # Unit model
│   ├── SubUnit.js           # Sub-unit model
│   ├── Lesson.js            # Lesson model
│   └── Content.js           # Content model with multiple types
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User management endpoints
│   ├── classes.js           # Class management endpoints
│   ├── subjects.js          # Subject management endpoints
│   ├── units.js             # Unit management endpoints
│   ├── subunits.js          # Sub-unit management endpoints
│   ├── lessons.js           # Lesson management endpoints
│   ├── content.js           # Content management endpoints
│   └── reports.js           # Statistics and reporting
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── utils/
│   └── generateToken.js     # JWT token generation utility
├── .env                     # Environment configuration
├── server.js                # Main Express server
└── seed.js                  # Database seeding script
```

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

## ⚙️ Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   The `.env` file is already configured with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/learning-platform
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

3. **Start MongoDB**:
   Make sure MongoDB is running locally on port 27017 or update the MONGODB_URI in `.env`

## 🚀 Usage

### Development Commands

```bash
# Start the backend server with auto-reload
npm run server:dev

# Start the backend server (production)
npm run server

# Seed the database with sample data
npm run seed

# Run both frontend and backend concurrently
npm run setup
```

### Database Setup

1. **Start MongoDB**: Ensure MongoDB is running locally
2. **Seed Database**: Populate with sample data:
   ```bash
   npm run seed
   ```
   
   This will create:
   - 2 Classes (Class 10, Class 12)
   - 3 Subjects (Physics, Chemistry, Mathematics)
   - 4 Units (Mechanics, Optics, Organic Chemistry, Calculus)
   - 4 Sub-units (Kinematics, Geometrical Optics, Hydrocarbons, Integration)
   - 6 Lessons (Newton's Laws, Work and Energy, etc.)
   - 11 Contents (various types)
   - 3 Users (admin, teacher, student)

3. **Default Credentials**:
   - **Admin**: username: `admin`, password: `admin123`
   - **Teacher**: username: `teacher`, password: `admin123`
   - **Student**: username: `student`, password: `admin123`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `PUT /api/users/me/profile` - Update user profile (authenticated)

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create new class (admin only)
- `PUT /api/classes/:id` - Update class (admin only)
- `DELETE /api/classes/:id` - Delete class with cascading (admin only)
- `GET /api/classes/:classId/subjects` - Get subjects for a class

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/classes/:classId/subjects` - Create subject (admin only)
- `PUT /api/subjects/:id` - Update subject (admin only)
- `DELETE /api/subjects/:id` - Delete subject with cascading (admin only)
- `GET /api/subjects/:subjectId/units` - Get units for a subject

### Units
- `GET /api/units` - Get all units
- `POST /api/subjects/:subjectId/units` - Create unit (admin only)
- `PUT /api/units/:id` - Update unit (admin only)
- `DELETE /api/units/:id` - Delete unit with cascading (admin only)
- `GET /api/units/:unitId/sub-units` - Get sub-units for a unit

### Sub-units
- `GET /api/sub-units` - Get all sub-units
- `POST /api/units/:unitId/sub-units` - Create sub-unit (admin only)
- `PUT /api/sub-units/:id` - Update sub-unit (admin only)
- `DELETE /api/sub-units/:id` - Delete sub-unit with cascading (admin only)
- `GET /api/sub-units/:subUnitId/lessons` - Get lessons for a sub-unit

### Lessons
- `GET /api/lessons` - Get all lessons
- `POST /api/sub-units/:subUnitId/lessons` - Create lesson (admin only)
- `PUT /api/lessons/:id` - Update lesson (admin only)
- `DELETE /api/lessons/:id` - Delete lesson with cascading (admin only)
- `GET /api/lessons/:lessonId/breadcrumbs` - Get breadcrumb path

### Content
- `GET /api/lessons/:lessonId/contents` - Get contents for a lesson
- `GET /api/lessons/:lessonId/counts` - Get content counts by type
- `POST /api/lessons/:lessonId/contents` - Create content (admin only)
- `POST /api/lessons/:lessonId/contents/bulk` - Create multiple contents (admin only)
- `PUT /api/contents/:id` - Update content (admin only)
- `DELETE /api/contents/:id` - Delete content (admin only)

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Reports
- `GET /api/reports/stats` - Get platform statistics (admin only)

## 🔐 Authentication & Authorization

- JWT tokens are required for most endpoints
- Add `Authorization: Bearer <token>` header to requests
- Admin role required for CRUD operations and reports
- Teacher role allowed for some content operations

## 🗃️ Database Schema

### Hierarchical Structure
```
Class → Subject → Unit → Sub-unit → Lesson → Content
```

### Content Types Supported
- `book` - PDF/Book content
- `notes` - Text/Markdown notes
- `video` - Video links
- `quiz` - Quiz data (JSON)
- `qa` - Question & Answer
- `flashcard` - Flashcard content
- `activity` - Interactive activities
- `worksheet` - Worksheet PDFs
- `questionPaper` - Question papers with metadata
- `audio` - Audio content

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation
- CORS enabled
- Error handling middleware
- Cascading deletes for data integrity

## 🧪 Testing the API

1. **Start MongoDB** and **seed the database**
2. **Start the server**: `npm run server:dev`
3. **Test endpoints** using Postman, curl, or any HTTP client

### Example cURL Commands

**Login**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Classes** (requires authentication):
```bash
curl -X GET http://localhost:5000/api/classes \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🚨 Important Notes

1. **MongoDB Connection**: Ensure MongoDB is running locally on port 27017
2. **JWT Secret**: Change the JWT_SECRET in `.env` for production
3. **Cascading Deletes**: Deleting higher-level items (classes, subjects, etc.) will automatically delete all related content
4. **Default Users**: Use the seeded admin account to create additional users
5. **File Uploads**: Currently stores file paths; integrate with cloud storage (AWS S3, Google Cloud) for production

## 🏗️ Next Steps

1. Add file upload functionality with multer
2. Implement pagination for large datasets
3. Add search functionality across content
4. Integrate with cloud storage for file management
5. Add rate limiting and security enhancements
6. Implement comprehensive testing suite

## 📝 Environment Configuration

Update the `.env` file for your specific setup:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/learning-platform
JWT_SECRET=your-secure-secret-key-here
NODE_ENV=production
```

For production deployments, use MongoDB Atlas and stronger security measures.