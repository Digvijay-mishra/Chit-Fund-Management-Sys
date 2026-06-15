import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { dashboard, createFinanceEntry } from '../controllers/finance.controller.js';
const r=Router(); r.use(auth); r.get('/dashboard',dashboard); r.post('/entry',createFinanceEntry); export default r;
