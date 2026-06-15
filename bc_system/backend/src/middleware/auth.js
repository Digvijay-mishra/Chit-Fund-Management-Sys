import jwt from 'jsonwebtoken';
export function auth(req,res,next){
 const header=req.headers.authorization||''; const token=header.startsWith('Bearer ')?header.slice(7):null;
 if(!token) return res.status(401).json({message:'No token provided'});
 try{ req.user=jwt.verify(token,process.env.JWT_SECRET); next(); }catch(e){ return res.status(401).json({message:'Invalid token'}); }
}
