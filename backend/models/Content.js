import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  type: {
    type: String,
    enum: ['book', 'notes', 'video', 'quiz', 'qa', 'flashcard', 'activity', 'extra', 'worksheet', 'questionPaper', 'audio'],
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
contentSchema.index({ lessonId: 1 });
contentSchema.index({ type: 1 });
contentSchema.index({ lessonId: 1, type: 1 });

export default mongoose.model('Content', contentSchema);