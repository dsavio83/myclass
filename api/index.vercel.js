const app = require('./index');
const mongoose = require('mongoose');

// Cache the database connection
let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected) {
        return;
    }

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in Vercel environment variables. Please configure MongoDB Atlas connection.');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log('✓ MongoDB Atlas Connected (Serverless)');
    } catch (error) {
        console.error('✗ MongoDB Connection Error (Serverless):', error.message);
        throw error; // Throw error to prevent serverless function from running without DB
    }
};

module.exports = async (req, res) => {
    try {
        await connectToDatabase();
        return app(req, res);
    } catch (error) {
        return res.status(500).json({
            error: 'Database connection failed',
            message: error.message
        });
    }
};
