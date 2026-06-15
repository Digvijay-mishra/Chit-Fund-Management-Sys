import mongoose from 'mongoose';
const schema = new mongoose.Schema({ channel:{type:String,enum:['sms','whatsapp','email'],required:true}, to:String, subject:String, body:String, status:{type:String,enum:['scheduled','sent','failed'],default:'sent'}, scheduledAt:Date, sentAt:Date, relatedTo:{type:String,enum:['member','group','transaction','general'],default:'general'} },{timestamps:true});
export default mongoose.model('MessageLog', schema);
