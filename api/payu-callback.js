import crypto from "crypto";

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return Object.fromEntries(new URLSearchParams(req.body || ""));
}
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!salt) return res.status(500).send("PayU salt is not configured.");
  const p = body(req);
  const reverse = [salt,p.status||"","","","","","",p.udf5||"",p.udf4||"",p.udf3||"",p.udf2||"",p.udf1||"",p.email||"",p.firstname||"",p.productinfo||"",p.amount||"",p.txnid||"",p.key||""].join("|");
  const expected = crypto.createHash("sha512").update(reverse).digest("hex");
  const valid = expected === p.hash;
  const ok = valid && p.status === "success" && p.amount === "50.00";
  const q = new URLSearchParams({payu:ok?"success":"failed",txnid:p.txnid||"",paymentId:p.mihpayid||"",reason:valid?(p.error_Message||p.status||""):"Payment verification failed"});
  return res.redirect(303,`/?${q.toString()}`);
}
