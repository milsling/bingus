import { Router } from "express";

const router = Router();

// Apple Server-to-Server Notification Endpoint
// Docs: https://developer.apple.com/documentation/sign_in_with_apple/communicating_with_apple_servers
router.post("/apple/notifications", (req, res) => {
  // Apple will send JSON payloads about account changes, email forwarding, etc.
  // You should verify the notification's authenticity here (JWT signature, etc.)
  // For now, just log and acknowledge
  console.log("[Apple Notification]", req.body);
  res.status(200).send("OK");
});

export default router;
