const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import models - optimized to only include what's needed
const { User, Content } = require('./models');

dotenv.config();

const app = express();

// Middleware - minimal and optimized
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple route handler function
const handleRoute = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Auth Routes - simplified
app.post('/auth/login', handleRoute(async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = `mock-token-${user._id}`;
    const { password: _, ...userWithoutPass } = user.toObject();
    res.json({ user: userWithoutPass, token });
}));

// User Management Routes
app.get('/users', handleRoute(async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
}));

app.post('/users', handleRoute(async (req, res) => {
    const newUser = new User(req.body);
    await newUser.save();
    const { password, ...userWithoutPass } = newUser.toObject();
    res.status(201).json(userWithoutPass);
}));

app.put('/users/:id', handleRoute(async (req, res) => {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json(updatedUser);
}));

app.delete('/users/:id', handleRoute(async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));

// Content Routes - simplified (no file uploads for now)
app.get('/content', handleRoute(async (req, res) => {
    const { lessonId, type } = req.query;
    const query = {};
    
    if (lessonId) query.lessonId = new mongoose.Types.ObjectId(lessonId);
    if (type) query.type = type;
    
    const contents = await Content.find(query);
    
    // Group by type
    const grouped = contents.reduce((acc, content) => {
        if (!acc[content.type]) {
            acc[content.type] = { type: content.type, count: 0, docs: [] };
        }
        acc[content.type].docs.push(content);
        acc[content.type].count++;
        return acc;
    }, {});
    
    res.json(Object.values(grouped));
}));

app.post('/content', handleRoute(async (req, res) => {
    const contentData = {
        ...req.body,
        lessonId: new mongoose.Types.ObjectId(req.body.lessonId)
    };
    
    const newContent = new Content(contentData);
    await newContent.save();
    res.status(201).json(newContent);
}));

app.put('/content/:id', handleRoute(async (req, res) => {
    const updatedContent = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedContent);
}));

app.delete('/content/:id', handleRoute(async (req, res) => {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));

// Stats Route
app.get('/stats', handleRoute(async (req, res) => {
    const [contentCount, userCount] = await Promise.all([
        Content.countDocuments(),
        User.countDocuments()
    ]);
    
    res.json({ contentCount, userCount });
}));

// Database connection cache
let dbConnected = false;

const connectToDatabase = async () => {
    if (dbConnected) return;
    
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        dbConnected = true;
        console.log('✓ MongoDB Connected (Serverless)');
    } catch (error) {
        console.error('✗ MongoDB Connection Error:', error.message);
        throw error;
    }
};

// Main serverless function handler
module.exports = async (req, res) => {
    try {
        await connectToDatabase();
        app(req, res);
    } catch (error) {
        res.status(500).json({
            error: 'Database connection failed',
            message: error.message
        });
    }
};
