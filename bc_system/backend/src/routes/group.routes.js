import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { createGroup, listGroups, getGroup, updateGroup, deleteGroup, selectWinner } from '../controllers/group.controller.js';
const r=Router(); r.use(auth); r.route('/').get(listGroups).post(createGroup); r.route('/:id').get(getGroup).put(updateGroup).delete(deleteGroup); r.post('/:id/winner',selectWinner); export default r;
