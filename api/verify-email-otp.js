import crypto from "node:crypto";
import { ensureSchema,sql,publicRegistration } from "./_db.js";
const normalizeEmail=v=>String(v||"").trim().toLowerCase();
const hashOtp=(email,otp)=>crypto.createHash("sha256").update(email+"|"+otp).digest("hex");
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 const email=normalizeEmail(req.body?.email),otp=String(req.body?.otp||"").trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{6}$/.test(otp))return res.status(400).json({error:"Enter your email and 6-digit OTP."});
 await ensureSchema();const q=sql();
 const rows=await q`SELECT * FROM email_otps WHERE LOWER(email)=${email} AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`;
 if(!rows.length||new Date(rows[0].expires_at).getTime()<Date.now())return res.status(401).json({error:"OTP expired or invalid. Request a new code."});
 if(rows[0].attempts>=5)return res.status(429).json({error:"Too many attempts. Request a new OTP."});
 const expected=Buffer.from(rows[0].otp_hash,"hex"),actual=Buffer.from(hashOtp(email,otp),"hex");
 const valid=expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
 if(!valid){await q`UPDATE email_otps SET attempts=attempts+1 WHERE id=${rows[0].id}`;return res.status(401).json({error:"Incorrect OTP."})}
 await q`UPDATE email_otps SET used_at=NOW() WHERE id=${rows[0].id}`;
 const registrations=await q`SELECT * FROM registrations WHERE LOWER(email)=${email} AND payment_status='paid' ORDER BY created_at DESC`;
 return res.status(200).json({verified:true,registrations:registrations.map(publicRegistration)});
}