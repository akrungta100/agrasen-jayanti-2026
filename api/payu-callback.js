import crypto from "crypto";

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return Object.fromEntries(new URLSearchParams(req.body || ""));
}

function sha512(value) {
  return crypto.createHash("sha512").update(value).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const salt = process.env.PAYU_MERCHANT_SALT;
  const key = process.env.PAYU_MERCHANT_KEY;
  if (!salt || !key) return res.status(500).send("PayU is not configured.");

  const p = body(req);
  const generic = [salt,p.status||"","","","","","",p.udf5||"",p.udf4||"",p.udf3||"",p.udf2||"",p.udf1||"",p.email||"",p.firstname||"",p.productinfo||"",p.amount||"",p.txnid||"",p.key||""].join("|");
  const additional = p.additional_charges ?? p.additionalCharges;
  const reverse = additional !== undefined && additional !== ""
    ? `${additional}|${generic}`
    : generic;
  const validHash = Boolean(p.hash) && sha512(reverse).toLowerCase() === String(p.hash).toLowerCase();
  const validMerchant = p.key === key;
  const callbackOk = validHash && validMerchant;

  const q = new URLSearchParams({
    payu: "return",
    txnid: p.txnid || "",
    callback: callbackOk ? "verified" : "invalid"
  });
  return res.redirect(303, `/?${q.toString()}`);
}
