import mongoose from 'mongoose';

const txSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', index: true },
  payerType: { type: String, enum: ['primary', 'joint', 'party'], default: 'party' },
  payerJointId: String,
  payerName: String,
  payerPhone: String,
  type: { type: String, enum: ['member_payment', 'winner_payout', 'commission', 'penalty', 'income', 'expense', 'payable', 'receivable'], required: true, index: true },
  category: String,
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'online', 'cheque', 'other'], default: 'cash' },
  cycleMonth: Number,
  dueDate: Date,
  paidDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial', 'waived', 'cancelled'], default: 'paid', index: true },
  penaltyAmount: { type: Number, default: 0 },
  receiptNo: { type: String, index: true },
  notes: String,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, { timestamps: true });

export default mongoose.model('Transaction', txSchema);
