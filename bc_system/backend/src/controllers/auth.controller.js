import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const sign=(user)=>jwt.sign({id:user._id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'});
export async function register(req,res,next){try{const {name,email,password}=req.body; const user=await User.create({name,email,password}); res.status(201).json({token:sign(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}})}catch(e){next(e)}}
export async function login(req,res,next){try{const {email,password}=req.body; const user=await User.findOne({email}); if(!user||!(await user.comparePassword(password))) return res.status(401).json({message:'Invalid credentials'}); res.json({token:sign(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}})}catch(e){next(e)}}
