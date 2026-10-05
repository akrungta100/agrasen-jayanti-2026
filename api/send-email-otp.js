import crypto from "node:crypto";
import { ensureSchema, sql } from "./_db.js";
const normalizeEmail=v=>String(v||"").trim().toLowerCase();
const hashOtp=(email,otp)=>crypto.createHash("sha256").update(email+"|"+otp).digest("hex");
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 const email=normalizeEmail(req.body?.email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Enter a valid registration email."});
 if(!process.env.RESEND_API_KEY)return res.status(500).json({error:"Email service is not configured."});
 await ensureSchema(); const q=sql();
 const paid=await q`SELECT 1 FROM registrations WHERE LOWER(email)=${email} AND payment_status='paid' LIMIT 1`;
 if(!paid.length)return res.status(200).json({sent:true});
 const recent=await q`SELECT created_at FROM email_otps WHERE LOWER(email)=${email} ORDER BY created_at DESC LIMIT 1`;
 if(recent.length&&Date.now()-new Date(recent[0].created_at).getTime()<60000)return res.status(429).json({error:"Please wait one minute before requesting another OTP."});
 const otp=String(crypto.randomInt(100000,1000000)), otpHash=hashOtp(email,otp);
 await q`UPDATE email_otps SET used_at=NOW() WHERE LOWER(email)=${email} AND used_at IS NULL`;
 await q`INSERT INTO email_otps (email,otp_hash,expires_at) VALUES (${email},${otpHash},NOW()+INTERVAL '10 minutes')`;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Agresen Jayanti 2026 <otp@agrasenmahotsav.com>",to:[email],subject:`${otp} is your My Games verification code`,html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2>Agresen Jayanti 2026</h2><p>Use this verification code to view your paid games:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</div><p>This code expires in 10 minutes and can be used only once.</p><p style="color:#666;font-size:12px">If you did not request this code, you can ignore this email.</p></div>`})});
 if(!response.ok){await q`UPDATE email_otps SET used_at=NOW() WHERE LOWER(email)=${email} AND otp_hash=${otpHash} AND used_at IS NULL`;return res.status(502).json({error:"Could not send the verification email. Please try again."})}
 return res.status(200).json({sent:true});
}