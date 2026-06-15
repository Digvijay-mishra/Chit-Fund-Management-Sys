import Group from '../models/Group.js';
import Member from '../models/Member.js';
import Transaction from '../models/Transaction.js';
export async function summary(req,res,next){try{const [groups,members,transactions]=await Promise.all([Group.countDocuments(),Member.countDocuments(),Transaction.find()]); const collections=transactions.filter(t=>t.type==='member_payment').reduce((s,t)=>s+t.amount,0); const penalties=transactions.reduce((s,t)=>s+(t.penaltyAmount||0),0); const commission=transactions.filter(t=>t.type==='commission').reduce((s,t)=>s+t.amount,0); res.json({groups,members,collections,penalties,commission})}catch(e){next(e)}}
