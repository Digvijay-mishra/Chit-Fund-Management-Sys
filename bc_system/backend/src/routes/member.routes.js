import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { createMember, listMembers, getMember, updateMember, deleteMember } from '../controllers/member.controller.js';
const r=Router(); r.use(auth); r.route('/').get(listMembers).post(createMember); r.route('/:id').get(getMember).put(updateMember).delete(deleteMember); export default r;
