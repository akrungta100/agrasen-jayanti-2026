import { ensureSchema, sql, cleanMobile, publicRegistration } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const mobile = cleanMobile(req.body?.mobile);
  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!/^\d{10}$/.test(mobile) || !/^AGR26-[A-F0-9]{8}$/.test(code)) {
    return res.status(400).json({ error: "Enter your 10-digit mobile number and a valid registration code." });
  }

  await ensureSchema();
  const q = sql();
  const auth = await q`SELECT 1 FROM registrations WHERE mobile = ${mobile} AND registration_code = ${code} LIMIT 1`;
  if (!auth.length) return res.status(403).json({ error: "Mobile number and registration code do not match." });

  const rows = await q`SELECT * FROM registrations WHERE mobile = ${mobile} AND payment_status = 'paid' ORDER BY created_at DESC`;
  return res.status(200).json({ registrations: rows.map(publicRegistration) });
}
