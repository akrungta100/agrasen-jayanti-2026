# Agrasen Jayanti 2026 — Razorpay + UPI Prototype

This version adds a real Razorpay checkout flow to the event registration prototype.

## Payment flow
1. Participant selects a game.
2. Participant fills registration details.
3. The server creates a Razorpay Order for exactly ₹50 (5000 paise).
4. Razorpay Checkout opens. UPI is available when enabled for the Razorpay account, along with other enabled payment methods.
5. Razorpay returns `razorpay_payment_id`, `razorpay_order_id` and `razorpay_signature`.
6. The server verifies the signature and confirms the payment is captured and exactly ₹50.
7. Only after verification does the prototype create the registration confirmation and registration ID.

## Vercel setup
Deploy this folder to Vercel. Add these Environment Variables in the Vercel project:

- `RAZORPAY_KEY_ID` = your Razorpay Test or Live Key ID
- `RAZORPAY_KEY_SECRET` = your Razorpay Test or Live Key Secret

Keep the Key Secret server-side. Never put it in `app.js`, HTML, or any public client-side file.

For testing, use Razorpay Test Mode first. After testing, switch the environment variables to Live Mode and complete Razorpay's onboarding/KYC and payment-method activation requirements.

## Files added
- `api/create-order.js` — server-side ₹50 order creation
- `api/verify-payment.js` — HMAC signature + captured-status verification
- `.env.example` — environment variable template
- `vercel.json` — Vercel function configuration

## Important
The current prototype keeps the local “My Registrations” list in the browser. Razorpay itself will show the transaction in its Dashboard. For a production event system, the next step should be a database (e.g. Supabase) so registrations, payment IDs, participant records and admin reports are stored centrally.
