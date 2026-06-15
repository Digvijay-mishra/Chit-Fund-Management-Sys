import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { sendOrSchedule, listMessages } from '../controllers/message.controller.js';
const r=Router(); r.use(auth); r.get('/',listMessages); r.post('/',sendOrSchedule); export default r;
