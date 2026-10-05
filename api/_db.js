import { neon } from "@neondatabase/serverless";

let initialized = false;

export function sql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Database is not configured.");
  return neon(url);
}

export async function ensureSchema() {
  if (initialized) return;
  const q = sql();
  await q`
    CREATE TABLE IF NOT EXISTS payment_intents (
      txnid TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      game_name TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT NOT NULL,
      guardian TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      event_time TEXT DEFAULT '',
      amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await q`
    CREATE TABLE IF NOT EXISTS registrations (
      id BIGSERIAL PRIMARY KEY,
      txnid TEXT UNIQUE NOT NULL,
      payu_payment_id TEXT NOT NULL,
      registration_code TEXT UNIQUE NOT NULL,
      game_id TEXT NOT NULL,
      game_name TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT NOT NULL,
      guardian TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      event_time TEXT DEFAULT '',
      amount NUMERIC(10,2) NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await q`CREATE INDEX IF NOT EXISTS registrations_mobile_idx ON registrations (mobile)`;
  await q`CREATE INDEX IF NOT EXISTS registrations_email_idx ON registrations (LOWER(email))`;
  await q`\n    CREATE TABLE IF NOT EXISTS email_otps (\n      id BIGSERIAL PRIMARY KEY,\n      email TEXT NOT NULL,\n      otp_hash TEXT NOT NULL,\n      expires_at TIMESTAMPTZ NOT NULL,\n      used_at TIMESTAMPTZ,\n      attempts INTEGER NOT NULL DEFAULT 0,\n      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n    )\n  `;
  await q`CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps (LOWER(email), created_at DESC)`;
  initialized = true;
}

export function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function publicRegistration(r) {
  return {
    game: r.game_name,
    gameId: r.game_id,
    name: r.participant_name,
    mobile: r.mobile,
    age: r.age,
    guardian: r.guardian || "",
    date: r.event_date || "",
    time: r.event_time || "",
    fee: Number(r.amount),
    code: r.registration_code,
    paymentId: r.payu_payment_id,
    orderId: r.txnid
  };
}
