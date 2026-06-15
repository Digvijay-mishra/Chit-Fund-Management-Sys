import Transaction from '../models/Transaction.js';

export async function dashboard(req, res, next) {
  try {
    const tx = await Transaction.find({ isDeleted: { $ne: true }, status: { $ne: 'cancelled' } });
    const incomeTypes = ['commission', 'income', 'member_payment', 'penalty', 'receivable'];
    const expenseTypes = ['expense', 'winner_payout', 'payable'];
    const income = tx.filter(t => incomeTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0) + Number(t.penaltyAmount || 0), 0);
    const expense = tx.filter(t => expenseTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const pending = tx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount || 0), 0);
    const entries = await Transaction.find({ type: { $in: ['income', 'expense', 'payable', 'receivable'] }, isDeleted: { $ne: true }, status: { $ne: 'cancelled' } }).sort('-createdAt');
    res.json({ income, expense, profit: income - expense, pending, totalTransactions: tx.length, entries });
  } catch (e) { next(e); }
}

export async function createFinanceEntry(req, res, next) {
  try {
    const tx = await Transaction.create({ ...req.body, isDeleted: false, status: req.body.status || 'paid' });
    res.status(201).json(tx);
  } catch (e) { next(e); }
}
