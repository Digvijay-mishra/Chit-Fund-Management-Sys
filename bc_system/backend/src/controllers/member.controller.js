import Member from '../models/Member.js';
import Group from '../models/Group.js';
import Transaction from '../models/Transaction.js';

function cleanJointMembers(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && x.name)
    .map(x => ({
      _id: x._id,
      name: x.name,
      phone: x.phone || '',
      email: x.email || '',
      shareAmount: Number(x.shareAmount || 0),
      sharePercent: Number(x.sharePercent || 0),
      paymentStatus: x.paymentStatus || 'pending',
      isDeleted: !!x.isDeleted
    }));
}

export async function createMember(req, res, next) {
  try {
    const group = await Group.findById(req.body.group);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    let ticketNumber = req.body.ticketNumber;
    if (!ticketNumber) {
      const count = await Member.countDocuments({ group: group._id, isDeleted: { $ne: true } });
      ticketNumber = group.buildTicketNumber(group.ticketStartNumber + count);
    }
    const member = await Member.create({
      ...req.body,
      ticketNumber,
      jointMembers: cleanJointMembers(req.body.jointMembers),
      isDeleted: false
    });
    res.status(201).json(member);
  } catch (e) { next(e); }
}

export async function listMembers(req, res, next) {
  try {
    const { q, group, status } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (group) filter.group = group;
    if (status) filter.status = status;
    if (q) filter.$or = [
      { primaryName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { ticketNumber: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { agentName: { $regex: q, $options: 'i' } },
      { agentCode: { $regex: q, $options: 'i' } },
      { agentPhone: { $regex: q, $options: 'i' } },
      { 'jointMembers.name': { $regex: q, $options: 'i' } },
      { 'jointMembers.phone': { $regex: q, $options: 'i' } }
    ];
    let members = await Member.find(filter).populate('group', 'name totalAmount monthlyContribution').sort({ ticketNumber: 1, createdAt: 1 }).lean();
    const ids = members.map(m => m._id);
    const dueTx = await Transaction.find({ member: { $in: ids }, type: 'member_payment', status: { $in: ['pending','overdue'] }, isDeleted: { $ne: true } }).lean();
    const today = new Date();
    members = members.map(m => {
      const txs = dueTx.filter(t => String(t.member) === String(m._id));
      const overdue = txs.filter(t => t.status === 'overdue' || (t.dueDate && new Date(t.dueDate) < today));
      return {
        ...m,
        dueStatus: overdue.length ? 'overdue' : txs.length ? 'pending' : 'paid',
        dueAmount: txs.reduce((sum,t)=>sum+Number(t.amount||0)+Number(t.penaltyAmount||0),0),
        currentCycle: (overdue[0] || txs[0])?.cycleMonth,
        dueDate: (overdue[0] || txs[0])?.dueDate
      };
    });
    res.json(members);
  } catch (e) { next(e); }
}

export async function getMember(req, res, next) {
  try {
    const member = await Member.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('group');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const transactions = await Transaction.find({ member: member._id, isDeleted: { $ne: true }, status: { $ne: 'cancelled' } }).populate('group', 'name').sort('-paidDate');
    res.json({ member, transactions });
  } catch (e) { next(e); }
}

export async function updateMember(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.jointMembers) body.jointMembers = cleanJointMembers(body.jointMembers);
    const member = await Member.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    res.json(member);
  } catch (e) { next(e); }
}

export async function deleteMember(req, res, next) {
  try {
    await Member.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'inactive' });
    res.json({ message: 'Member removed from active view' });
  } catch (e) { next(e); }
}
