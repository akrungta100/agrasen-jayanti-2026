import { ensureSchema, sql, cleanMobile, publicRegistration } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const mobile = cleanMobile(req.body?.mobile);
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Enter the 10-digit mobile number used for registration." });
  }

  await ensureSchema();
  const q = sql();
  const rows = await q`SELECT * FROM registrations WHERE mobile = ${mobile} AND payment_status = 'paid' ORDER BY created_at DESC`;
  return res.status(200).json({ registrations: rows.map(publicRegistration) });
}
