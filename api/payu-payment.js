import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return res.status(500).json({ error: "PayU credentials are not configured." });

  const { gameId, gameName, participantName, mobile, age, email } = req.body || {};
  if (!gameId || !gameName || !participantName || !mobile || !age || !email) {
    return res.status(400).json({ error: "Missing participant details." });
  }

  const txnid = `AGR26_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const amount = "50.00";
  const productinfo = `Agrasen Jayanti 2026 - ${String(gameName).slice(0,80)}`;
  const firstname = String(participantName).trim().split(/\s+/)[0].slice(0,60);
  const udf1 = String(gameId), udf2 = String(age), udf3 = String(mobile), udf4 = "", udf5 = "";
  const hashString = [key,txnid,amount,productinfo,firstname,email,udf1,udf2,udf3,udf4,udf5,"","","","","",salt].join("|");
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");
  const origin = "https://agrasenmahotsav.com";
  const callback = `${origin}/api/payu-callback`;

  return res.status(200).json({
    action: "https://secure.payu.in/_payment",
    fields: { key, txnid, amount, productinfo, firstname, email, phone: String(mobile), udf1, udf2, udf3, udf4, udf5, surl: callback, furl: callback, hash }
  });
}
