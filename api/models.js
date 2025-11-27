const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isFirstLogin: { type: Boolean, default: true },
    mobileNumber: { type: String },
    canEdit: { type: Boolean, default: false }
}, { timestamps: true });

const classSchema = new mongoose.Schema({
    name: { type: String, required: true }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true }
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }
}, { timestamps: true });

const subUnitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true }
}, { timestamps: true });

const lessonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubUnit', required: true }
}, { timestamps: true });

const webmasterSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const contentSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String }, // Text content or JSON
    filePath: { type: String }, // Path to uploaded file
    originalFileName: { type: String }, // Original filename
    fileSize: { type: Number }, // File size in bytes
    viewCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Create indexes for better query performance
contentSchema.index({ lessonId: 1, type: 1 });
userSchema.index({ username: 1 });

module.exports = {
    User: mongoose.model('User', userSchema),
    Class: mongoose.model('Class', classSchema),
    Subject: mongoose.model('Subject', subjectSchema),
    Unit: mongoose.model('Unit', unitSchema),
    SubUnit: mongoose.model('SubUnit', subUnitSchema),
    Lesson: mongoose.model('Lesson', lessonSchema),
    Content: mongoose.model('Content', contentSchema),
    Webmaster: mongoose.model('Webmaster', webmasterSchema)
};