import crypto from "crypto";
import { ensureSchema, sql, cleanMobile } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return res.status(500).json({ error: "PayU credentials are not configured." });

  const { gameId, gameName, participantName, mobile, age, email, guardian, eventDate, eventTime } = req.body || {};
  const phone = cleanMobile(mobile);
  const numericAge = Number(age);
  if (!gameId || !gameName || !participantName || !/^\d{10}$/.test(phone) || !Number.isFinite(numericAge) || numericAge < 0 || numericAge > 100 || !email) {
    return res.status(400).json({ error: "Please check the participant details." });
  }

  const txnid = `AGR26_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const amount = "50.00";
  const productinfo = `Agresen Jayanti 2026 - ${String(gameName).slice(0,80)}`;
  const firstname = String(participantName).trim().split(/\s+/)[0].slice(0,60);
  const udf1 = String(gameId), udf2 = String(numericAge), udf3 = phone, udf4 = "", udf5 = "";
  const hashString = [key,txnid,amount,productinfo,firstname,email,udf1,udf2,udf3,udf4,udf5,"","","","","",salt].join("|");
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  await ensureSchema();
  const q = sql();
  await q`
    INSERT INTO payment_intents
      (txnid, game_id, game_name, participant_name, mobile, age, email, guardian, event_date, event_time, amount)
    VALUES
      (${txnid}, ${String(gameId)}, ${String(gameName)}, ${String(participantName).trim()}, ${phone},
       ${numericAge}, ${String(email).trim().toLowerCase()}, ${String(guardian || "").trim()},
       ${String(eventDate || "")}, ${String(eventTime || "")}, 50.00)
  `;

  const callback = "https://agrasenmahotsav.com/api/payu-callback";
  return res.status(200).json({
    action: "https://secure.payu.in/_payment",
    fields: { key, txnid, amount, productinfo, firstname, email: String(email).trim(), phone, udf1, udf2, udf3, udf4, udf5, surl: callback, furl: callback, hash }
  });
}
