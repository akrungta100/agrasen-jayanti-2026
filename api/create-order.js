export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: "Razorpay keys are not configured in Vercel."
    });
  }

  try {
    const {
      gameId,
      participantName,
      mobile,
      age
    } = req.body || {};

    if (!gameId || !participantName || !mobile || !age) {
      return res.status(400).json({
        error: "Missing participant details."
      });
    }

    const amount = 5000;

    const auth = Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `AGR26-${Date.now()}`,
          notes: {
            event: "Agrasen Jayanti Mahotsav 2026",
            gameId: String(gameId),
            participantName: String(participantName),
            mobile: String(mobile),
            age: String(age)
          }
        })
      }
    );

    const data = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      return res.status(razorpayResponse.status).json({
        error: data?.error?.description || "Razorpay order creation failed."
      });
    }

    return res.status(200).json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to create Razorpay order."
    });
  }
}
