import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return res.status(500).json({
      error: "Razorpay secret is not configured in Vercel."
    });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        error: "Missing Razorpay payment details."
      });
    }

    const body =
      `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        error: "Payment signature verification failed."
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const auth = Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return res.status(400).json({
        error:
          payment?.error?.description ||
          "Unable to verify payment."
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        error: "Payment order mismatch."
      });
    }

    if (payment.amount !== 5000) {
      return res.status(400).json({
        error: "Payment amount mismatch."
      });
    }

    if (payment.status !== "captured") {
      return res.status(400).json({
        error: `Payment status is ${payment.status}.`
      });
    }

    return res.status(200).json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: payment.status
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Payment verification failed."
    });
  }
}
