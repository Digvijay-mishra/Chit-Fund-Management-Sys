import cron from 'node-cron';
import dayjs from 'dayjs';
import Group from '../models/Group.js';
import Member from '../models/Member.js';
import Transaction from '../models/Transaction.js';
import MessageLog from '../models/MessageLog.js';

function childParties(member) {
  const joints = (member.jointMembers || []).filter(j => !j.isDeleted);
  const jointTotal = joints.reduce((s, j) => s + Number(j.shareAmount || 0), 0);
  const primaryShare = joints.length ? Math.max(Number(member.ticketAmount || 0) - jointTotal, 0) : Number(member.ticketAmount || 0);
  return [
    { payerType: 'primary', payerJointId: '', payerName: member.primaryName, payerPhone: member.phone, amount: primaryShare || Number(member.ticketAmount || 0) },
    ...joints.map(j => ({ payerType: 'joint', payerJointId: String(j._id), payerName: j.name, payerPhone: j.phone, amount: Number(j.shareAmount || 0) }))
  ];
}

function penaltyAmount(group, dueDate, amount) {
  const grace = Number(group?.penalty?.graceDays || 0);
  const daysLate = Math.max(0, dayjs().startOf('day').diff(dayjs(dueDate).startOf('day'), 'day') - grace);
  if (daysLate <= 0) return 0;
  const value = Number(group?.penalty?.value || 0);
  const base = group?.penalty?.type === 'percentage' ? Number(amount || 0) * value / 100 : value;
  return group?.penalty?.frequency === 'per_month' ? base * Math.ceil(daysLate / 30) : base * daysLate;
}

export async function runDailyDueScan() {
  const today = dayjs().endOf('day');
  const groups = await Group.find({ status: 'active' });
  let created = 0, updated = 0, reminders = 0;

  for (const group of groups) {
    const dueCycles = (group.cycles || []).filter(c => c.dueDate && dayjs(c.dueDate).isBefore(today));
    if (!dueCycles.length) continue;
    const members = await Member.find({ group: group._id, isDeleted: { $ne: true }, status: { $ne: 'inactive' } });

    for (const member of members) {
      for (const cycle of dueCycles) {
        for (const party of childParties(member)) {
          const query = {
            group: group._id,
            member: member._id,
            cycleMonth: cycle.monthNo,
            payerType: party.payerType,
            payerJointId: party.payerJointId || '',
            type: 'member_payment',
            isDeleted: { $ne: true }
          };
          const paid = await Transaction.findOne({ ...query, status: 'paid' });
          if (paid) continue;
          const late = dayjs().startOf('day').isAfter(dayjs(cycle.dueDate).startOf('day'));
          const status = late ? 'overdue' : 'pending';
          const penalty = penaltyAmount(group, cycle.dueDate, party.amount);
          const pending = await Transaction.findOne({ ...query, status: { $in: ['pending', 'overdue'] } });
          if (pending) {
            pending.status = status;
            pending.penaltyAmount = penalty;
            pending.dueDate = cycle.dueDate;
            pending.amount = party.amount;
            await pending.save();
            updated++;
          } else {
            await Transaction.create({
              ...query,
              payerName: party.payerName,
              payerPhone: party.payerPhone,
              amount: party.amount,
              method: 'cash',
              dueDate: cycle.dueDate,
              paidDate: cycle.dueDate,
              status,
              penaltyAmount: penalty,
              notes: `Auto due generated for cycle ${cycle.monthNo}`
            });
            created++;
          }

          if (status === 'overdue' && party.payerPhone) {
            const already = await MessageLog.findOne({ to: party.payerPhone, member: member._id, body: { $regex: `cycle ${cycle.monthNo}`, $options: 'i' }, createdAt: { $gte: dayjs().startOf('day').toDate() } });
            if (!already) {
              await MessageLog.create({
                channel: 'whatsapp',
                to: party.payerPhone,
                subject: 'BC payment overdue reminder',
                body: `Dear ${party.payerName}, your BC installment for Group ${group.name}, Ticket ${member.ticketNumber}, cycle ${cycle.monthNo} is overdue. Amount: ₹${party.amount}. Penalty: ₹${penalty}.`,
                status: 'scheduled',
                scheduledAt: new Date(),
                relatedTo: 'member',
                member: member._id
              });
              reminders++;
            }
          }
        }
      }

      const stillDue = await Transaction.exists({ member: member._id, type: 'member_payment', status: 'overdue', isDeleted: { $ne: true } });
      if (stillDue) await Member.findByIdAndUpdate(member._id, { status: 'defaulter' });
    }
  }
  console.log(`[BC CRON] Daily due scan completed. Created: ${created}, Updated: ${updated}, Reminders: ${reminders}`);
  return { created, updated, reminders };
}

export function startDailyCron(){
  cron.schedule('5 0 * * *', runDailyDueScan);
  if (process.env.RUN_DUE_SCAN_ON_START === 'true') runDailyDueScan().catch(err => console.error('[BC CRON] startup scan failed', err));
}
