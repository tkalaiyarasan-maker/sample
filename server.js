
import "dotenv/config";
import express from "express";
import { AccessToken } from "livekit-server-sdk";

const app = express();
app.use(express.json({ limit: "10kb" }));

const {
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  RIDETALK_ACCESS_CODE,
  PORT = 3000
} = process.env;

if (
  !LIVEKIT_URL ||
  !LIVEKIT_API_KEY ||
  !LIVEKIT_API_SECRET ||
  !RIDETALK_ACCESS_CODE
) {
  throw new Error("Check the required values in your .env file.");
}

app.get("/health", (_req, res) => {
  res.json({ status: "RideTalk token server is running" });
});

app.post("/token", async (req, res) => {
  try {
    const accessCode = req.get("x-ridetalk-code") || "";

    if (accessCode !== RIDETALK_ACCESS_CODE) {
      return res.status(401).json({ error: "Invalid access code" });
    }

    const roomCode = String(req.body?.roomCode ?? "")
      .trim()
      .toUpperCase();

    const identity = String(req.body?.identity ?? "").trim();

    if (!/^[A-Z0-9-]{4,20}$/.test(roomCode)) {
      return res.status(400).json({ error: "Invalid room code" });
    }

    if (!/^[A-Za-z0-9_-]{1,40}$/.test(identity)) {
      return res.status(400).json({ error: "Invalid rider name" });
    }

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { identity, ttl: "10m" }
    );

    token.addGrant({
      roomJoin: true,
      room: `ride-${roomCode}`,
      canPublish: true,
      canSubscribe: true
    });

    res.json({
      serverUrl: LIVEKIT_URL,
      token: await token.toJwt()
    });
  } catch (error) {
    console.error("Token creation failed:", error.message);
    res.status(500).json({ error: "Token creation failed" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`RideTalk token server running on port ${PORT}`);
});
