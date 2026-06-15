import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { summary } from '../controllers/report.controller.js';
const r=Router(); r.use(auth); r.get('/summary',summary); export default r;
