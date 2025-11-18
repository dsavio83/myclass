import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubUnit',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Lesson', lessonSchema);