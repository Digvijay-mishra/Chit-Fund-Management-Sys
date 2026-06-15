import dotenv from 'dotenv'; dotenv.config();
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
await connectDB();
await User.deleteMany({email:'admin@bc.local'});
await User.create({name:'Admin',email:'admin@bc.local',password:'admin123'});
console.log('Seeded admin: admin@bc.local / admin123'); process.exit();
