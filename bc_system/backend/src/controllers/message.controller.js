import MessageLog from '../models/MessageLog.js';
export async function sendOrSchedule(req,res,next){try{const scheduled=!!req.body.scheduledAt; const log=await MessageLog.create({...req.body,status:scheduled?'scheduled':'sent',sentAt:scheduled?undefined:new Date()}); res.status(201).json(log)}catch(e){next(e)}}
export async function listMessages(req,res,next){try{res.json(await MessageLog.find().sort('-createdAt'))}catch(e){next(e)}}
