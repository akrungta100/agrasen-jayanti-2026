import crypto from "crypto";
import { ensureSchema, sql, publicRegistration } from "./_db.js";

function sha512(v) { return crypto.createHash("sha512").update(v).digest("hex"); }

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const txnid = String((req.method === "GET" ? req.query?.txnid : req.body?.txnid) || "").trim();
  if (!/^AGR26_[A-Za-z0-9_]+$/.test(txnid)) return res.status(400).json({ error: "Invalid transaction." });

  const key = process.env.PAYU_MERCHANT_KEY, salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return res.status(500).json({ error: "PayU is not configured." });

  await ensureSchema();
  const q = sql();
  const existing = await q`SELECT * FROM registrations WHERE txnid = ${txnid} LIMIT 1`;
  if (existing.length) return res.status(200).json({ verified: true, registration: publicRegistration(existing[0]) });

  const intents = await q`SELECT * FROM payment_intents WHERE txnid = ${txnid} LIMIT 1`;
  if (!intents.length) return res.status(404).json({ error: "Registration request not found." });
  const intent = intents[0];

  const command = "verify_payment";
  const hash = sha512(`${key}|${command}|${txnid}|${salt}`);
  const form = new URLSearchParams({ key, command, var1: txnid, hash });
  const verifyResponse = await fetch("https://info.payu.in/merchant/postservice.php?form=2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  if (!verifyResponse.ok) return res.status(502).json({ error: "Could not verify payment with PayU." });
  const data = await verifyResponse.json();
  const payment = data?.transaction_details?.[txnid];

  const paid = payment &&
    String(payment.txnid || txnid) === txnid &&
    String(payment.status || "").toLowerCase() === "success" &&
    Number(payment.amt ?? payment.amount) === 50 &&
    Number(intent.amount) === 50;

  if (!paid) return res.status(200).json({ verified: false, status: String(payment?.status || "pending") });

  const paymentId = String(payment.mihpayid || "");
  if (!paymentId) return res.status(502).json({ error: "PayU payment reference is missing." });
  const registrationCode = "AGR26-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  const rows = await q`
    INSERT INTO registrations
      (txnid, payu_payment_id, registration_code, game_id, game_name, participant_name, mobile, age, email, guardian, event_date, event_time, amount, payment_status)
    VALUES
      (${txnid}, ${paymentId}, ${registrationCode}, ${intent.game_id}, ${intent.game_name}, ${intent.participant_name},
       ${intent.mobile}, ${intent.age}, ${intent.email}, ${intent.guardian}, ${intent.event_date}, ${intent.event_time}, 50.00, 'paid')
    ON CONFLICT (txnid) DO UPDATE SET payu_payment_id = EXCLUDED.payu_payment_id
    RETURNING *
  `;
  return res.status(200).json({ verified: true, registration: publicRegistration(rows[0]) });
}
