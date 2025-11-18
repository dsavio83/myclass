import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import classRoutes from './routes/classes.js';
import subjectRoutes from './routes/subjects.js';
import unitRoutes from './routes/units.js';
import subUnitRoutes from './routes/subunits.js';
import lessonRoutes from './routes/lessons.js';
import contentRoutes from './routes/content.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/uploads.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(morgan('combined'));

// Handle JSON requests with larger limit for small data
app.use(express.json({ limit: '50mb' }));

// Handle URL-encoded data with larger limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/sub-units', subUnitRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api', contentRoutes); // Content routes handle multiple endpoints
app.use('/api', uploadRoutes); // Upload routes
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = dbState === 1;
  const body = {
    message: 'Learning Platform API is running',
    timestamp: new Date().toISOString(),
    dbState,
  };

  if (isDbConnected) {
    return res.json(body);
  }

  // If DB not connected, return 503 so orchestrators (or start script) can wait
  return res.status(503).json({ ...body, error: 'MongoDB not connected' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
});