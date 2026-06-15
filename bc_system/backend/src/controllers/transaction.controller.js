import Transaction from '../models/Transaction.js';
import Group from '../models/Group.js';
import Member from '../models/Member.js';

export function calcPenalty(group, dueDate, paidDate, baseAmount) {
  const grace = group?.penalty?.graceDays || 0;
  const days = Math.max(0, Math.ceil((new Date(paidDate) - new Date(dueDate)) / (1000 * 60 * 60 * 24)) - grace);
  if (days <= 0) return 0;
  const raw = group.penalty.type === 'percentage' ? baseAmount * group.penalty.value / 100 : group.penalty.value;
  return group.penalty.frequency === 'per_month' ? raw * Math.ceil(days / 30) : raw * days;
}

async function enrichPayer(body) {
  if (!body.member) return body;
  const member = await Member.findById(body.member);
  if (!member) return body;
  const out = { ...body };
  if (body.payerJointId) {
    const joint = member.jointMembers.id(body.payerJointId) || member.jointMembers.find(j => String(j._id) === String(body.payerJointId));
    if (joint) {
      out.payerType = 'joint';
      out.payerName = joint.name;
      out.payerPhone = joint.phone;
    }
  } else {
    out.payerType = 'primary';
    out.payerName = body.payerName || member.primaryName;
    out.payerPhone = body.payerPhone || member.phone;
  }
  return out;
}

export async function createTransaction(req, res, next) {
  try {
    let body = await enrichPayer(req.body);
    let penaltyAmount = 0;
    if (body.type === 'member_payment' && body.group && body.dueDate) {
      const group = await Group.findById(body.group);
      penaltyAmount = calcPenalty(group, body.dueDate, body.paidDate || new Date(), body.amount);
    }
    const tx = await Transaction.create({ ...body, penaltyAmount, isDeleted: false });
    const populated = await Transaction.findById(tx._id).populate('group', 'name').populate('member', 'primaryName phone ticketNumber jointMembers');
    res.status(201).json(populated);
  } catch (e) { next(e); }
}

export async function bulkPayments(req, res, next) {
  try {
    const { payments } = req.body;
    const docs = await Transaction.insertMany(payments.map(p => ({ ...p, type: p.type || 'member_payment', status: p.status || 'paid', isDeleted: false })));
    res.status(201).json(docs);
  } catch (e) { next(e); }
}

export async function listTransactions(req, res, next) {
  try {
    const { q, type, status, group, member, from, to, financeOnly } = req.query;
    const filter = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (financeOnly === 'true') filter.type = { $in: ['income', 'expense', 'payable', 'receivable'] };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (group) filter.group = group;
    if (member) filter.member = member;
    if (from || to) filter.paidDate = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    if (q) filter.$or = [
      { receiptNo: { $regex: q, $options: 'i' } },
      { notes: { $regex: q, $options: 'i' } },
      { method: { $regex: q, $options: 'i' } },
      { payerName: { $regex: q, $options: 'i' } },
      { payerPhone: { $regex: q, $options: 'i' } }
    ];
    const data = await Transaction.find(filter).populate('group', 'name').populate('member', 'primaryName phone ticketNumber jointMembers').sort('-paidDate');
    res.json(data);
  } catch (e) { next(e); }
}

export async function updateTransaction(req, res, next) {
  try {
    const body = await enrichPayer(req.body);
    const tx = await Transaction.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).populate('group', 'name').populate('member', 'primaryName phone ticketNumber jointMembers');
    res.json(tx);
  } catch (e) { next(e); }
}

export async function deleteTransaction(req, res, next) {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'cancelled', deletedAt: new Date() });
    res.json({ message: 'Transaction removed from active view' });
  } catch (e) { next(e); }
}

export async function waivePenalty(req, res, next) {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, { penaltyAmount: 0, status: 'waived' }, { new: true });
    res.json(tx);
  } catch (e) { next(e); }
}
