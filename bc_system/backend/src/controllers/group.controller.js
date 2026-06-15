import Group from '../models/Group.js';
import Member from '../models/Member.js';
import Transaction from '../models/Transaction.js';

export async function createGroup(req, res, next) {
  try {
    const group = new Group(req.body);
    group.cycles = Array.from({ length: group.durationMonths }, (_, i) => ({
      monthNo: i + 1,
      dueDate: new Date(new Date(group.startDate).setMonth(new Date(group.startDate).getMonth() + i))
    }));
    await group.save();
    res.status(201).json(group);
  } catch (e) { next(e); }
}

export async function listGroups(req, res, next) {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const groups = await Group.find(filter).sort({ createdAt: 1 });
    res.json(groups);
  } catch (e) { next(e); }
}

export async function getGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id).populate('cycles.winnerMember');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    let members = await Member.find({ group: group._id, isDeleted: { $ne: true } }).sort({ ticketNumber: 1, createdAt: 1 }).lean();
    const transactions = await Transaction.find({ group: group._id, isDeleted: { $ne: true }, status: { $ne: 'cancelled' } }).populate('member', 'primaryName phone ticketNumber').sort('-paidDate').limit(500);
    const allTx = await Transaction.find({ group: group._id, isDeleted: { $ne: true }, type: 'member_payment', status: { $ne: 'cancelled' } }).lean();
    const today = new Date();
    members = members.map(m => {
      const memberTx = allTx.filter(t => String(t.member) === String(m._id));
      const pendingTx = memberTx.filter(t => ['pending','overdue'].includes(t.status));
      const overdueTx = pendingTx.filter(t => t.status === 'overdue' || (t.dueDate && new Date(t.dueDate) < today));
      const dueAmount = pendingTx.reduce((sum, t) => sum + Number(t.amount || 0) + Number(t.penaltyAmount || 0), 0);
      const currentDue = overdueTx[0] || pendingTx[0] || null;
      const childDueMap = {};
      for (const t of pendingTx) {
        const key = t.payerJointId ? String(t.payerJointId) : 'primary';
        childDueMap[key] = childDueMap[key] || { dueAmount: 0, dueStatus: 'paid', dueDate: t.dueDate, cycleMonth: t.cycleMonth };
        childDueMap[key].dueAmount += Number(t.amount || 0) + Number(t.penaltyAmount || 0);
        childDueMap[key].dueStatus = t.status === 'overdue' || (t.dueDate && new Date(t.dueDate) < today) ? 'overdue' : 'pending';
      }
      return {
        ...m,
        dueStatus: overdueTx.length ? 'overdue' : pendingTx.length ? 'pending' : 'paid',
        dueAmount,
        dueDate: currentDue?.dueDate,
        currentCycle: currentDue?.cycleMonth,
        childDueMap
      };
    });
    res.json({ group, members, transactions });
  } catch (e) { next(e); }
}

export async function updateGroup(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.durationMonths || body.startDate) {
      const existing = await Group.findById(req.params.id);
      const duration = Number(body.durationMonths || existing.durationMonths);
      const startDate = body.startDate || existing.startDate;
      const oldCycles = existing.cycles || [];
      body.cycles = Array.from({ length: duration }, (_, i) => oldCycles[i] || ({
        monthNo: i + 1,
        dueDate: new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + i))
      }));
    }
    const group = await Group.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    res.json(group);
  } catch (e) { next(e); }
}

export async function deleteGroup(req, res, next) {
  try {
    await Member.updateMany({ group: req.params.id }, { isDeleted: true, status: 'inactive' });
    await Transaction.updateMany({ group: req.params.id }, { isDeleted: true, status: 'cancelled', deletedAt: new Date() });
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted' });
  } catch (e) { next(e); }
}

export async function selectWinner(req, res, next) {
  try {
    const { monthNo, winnerMemberId, winnerTicket } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const commission = group.commissionType === 'percentage' ? group.totalAmount * group.commissionValue / 100 : group.commissionValue;
    const winnerAmount = group.totalAmount - commission;
    const c = group.cycles.find(x => x.monthNo == monthNo);
    if (!c) return res.status(404).json({ message: 'Cycle not found' });
    Object.assign(c, { winnerMember: winnerMemberId || undefined, winnerTicket, winnerAmount, commission, status: 'completed' });
    await group.save();
    if (winnerMemberId) {
      await Transaction.create({ group: group._id, member: winnerMemberId, type: 'winner_payout', amount: winnerAmount, cycleMonth: monthNo, status: 'paid', notes: `Winner payout for cycle ${monthNo}` });
    }
    await Transaction.create({ group: group._id, type: 'commission', amount: commission, cycleMonth: monthNo, status: 'paid', notes: `Commission for cycle ${monthNo}` });
    res.json(group);
  } catch (e) { next(e); }
}
