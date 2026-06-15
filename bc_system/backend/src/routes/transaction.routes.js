import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { createTransaction, bulkPayments, listTransactions, waivePenalty, updateTransaction, deleteTransaction } from '../controllers/transaction.controller.js';
const r=Router(); r.use(auth); r.route('/').get(listTransactions).post(createTransaction); r.post('/bulk',bulkPayments); r.route('/:id').put(updateTransaction).delete(deleteTransaction); r.patch('/:id/waive-penalty',waivePenalty); export default r;
