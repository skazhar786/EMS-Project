import mongoose from 'mongoose';

// Atomic sequence generator (used for employee IDs like EMP-0001).
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

// Returns the next number in the named sequence. $inc is atomic, so two
// simultaneous requests can never receive the same number.
counterSchema.statics.next = async function (name) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
};

export default mongoose.model('Counter', counterSchema);
