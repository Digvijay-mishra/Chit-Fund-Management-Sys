import mongoose from 'mongoose';

const jointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  shareAmount: { type: Number, default: 0 },
  sharePercent: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'late'], default: 'pending' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  primaryName: { type: String, required: true, index: true },
  phone: { type: String, required: true, index: true },
  email: String,
  address: String,
  agentName: { type: String, index: true },
  agentCode: String,
  agentPhone: String,
  agentAddress: String,
  ticketNumber: { type: String, required: true, index: true },
  ticketAmount: { type: Number, required: true },
  jointMembers: [jointSchema],
  status: { type: String, enum: ['active', 'inactive', 'defaulter'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
  notes: String,
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

memberSchema.index({ group: 1, ticketNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export default mongoose.model('Member', memberSchema);
