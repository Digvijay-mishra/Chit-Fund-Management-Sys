import mongoose from 'mongoose';
const installmentPlanSchema = new mongoose.Schema({ monthFrom:Number, monthTo:Number, amount:{type:Number,default:0}, note:String },{_id:false});
const cycleSchema = new mongoose.Schema({ monthNo:Number, dueDate:Date, winnerTicket:String, winnerMember:{type:mongoose.Schema.Types.ObjectId,ref:'Member'}, winnerAmount:{type:Number,default:0}, commission:{type:Number,default:0}, status:{type:String,enum:['pending','completed'],default:'pending'} },{_id:false});
const groupSchema = new mongoose.Schema({
 name:{type:String,required:true,index:true}, totalAmount:{type:Number,required:true}, monthlyContribution:{type:Number,required:true}, durationMonths:{type:Number,required:true}, startDate:{type:Date,required:true}, memberLimit:{type:Number,required:true}, status:{type:String,enum:['pending','active','completed'],default:'active'}, commissionType:{type:String,enum:['fixed','percentage'],default:'percentage'}, commissionValue:{type:Number,default:5}, ticketPrefix:{type:String,default:'BC'}, ticketStartNumber:{type:Number,default:1}, ticketPadding:{type:Number,default:3}, penalty:{ graceDays:{type:Number,default:3}, type:{type:String,enum:['fixed','percentage'],default:'fixed'}, value:{type:Number,default:100}, frequency:{type:String,enum:['per_day','per_month'],default:'per_day'} }, cycles:[cycleSchema], installmentPlans:[installmentPlanSchema]
},{timestamps:true});
groupSchema.methods.buildTicketNumber=function(n){return `${this.ticketPrefix}-${String(n).padStart(this.ticketPadding,'0')}`};
export default mongoose.model('Group', groupSchema);
