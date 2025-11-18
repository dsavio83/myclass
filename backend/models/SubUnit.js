import mongoose from 'mongoose';

const subUnitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('SubUnit', subUnitSchema);