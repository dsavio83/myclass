const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
    origin: "*", // Allow all origins for now, restrict in production
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// Increase payload limit to 50MB for PDF uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', routes);

// Database Connection - ONLY MongoDB Atlas, no fallback
const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables. Please configure MongoDB Atlas connection in api/.env file.');
        }

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✓ MongoDB Atlas Connected Successfully');
            console.log('✓ Database:', mongoose.connection.name);
        }
    } catch (err) {
        console.error('✗ MongoDB Connection Error:', err.message);
        console.error('✗ Application cannot start without database connection');
        // Exit process if database connection fails
        process.exit(1);
    }
};

// Start Server (Only for local development)
if (process.env.NODE_ENV !== 'production') {
    connectDB();
    app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
    });
}

module.exports = app;
