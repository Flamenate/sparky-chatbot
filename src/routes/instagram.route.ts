import express, { Router, Request, Response } from "express";
import { verifyRequestSignature } from "../middleware/validation.middleware";
import { verifyMetaWebhook } from "../utils/meta";
import axios from "axios";
import {
  ASKED_FOR_HUMAN_RESPONSE,
  generateResponse,
} from "../controllers/agent.controller";
import Conversation from "../models/Conversation";
import {
  generationKey,
  abortIfRunning,
  unregister,
  register,
} from "../utils/generationRegistry";
import {
  InstagramWebhookPayload,
  instagramWebhookSchema,
} from "../schemas/instagram.schema";

const router = Router();
router.use(express.json({ verify: verifyRequestSignature }));

/**
 * GET /webhook — Meta webhook verification.
 */
router.get("/", verifyMetaWebhook);

//Always send 200 response to avoid webhook retries, even if we encounter an error processing the message
router.post("/", async (req: Request, res: Response) => {
  try {
    instagramWebhookSchema.parse(req.body);
  } catch (error) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const payload = (req.body as InstagramWebhookPayload).entry[0];
  const userId = payload.messaging[0].sender.id;
  const messageText = payload.messaging[0].message.text;
  console.log(`Received Instagram message from ${userId}: "${messageText}"`);

  const conversation = await Conversation.findOneAndUpdate(
    {
      userId,
      platform: "instagram",
    },
    {
      $push: {
        messages: {
          role: "user",
          content: messageText,
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (conversation.get("hoursSinceAskedForHuman") < 12) {
    res.sendStatus(200);
    return;
  }

  const key = generationKey("instagram", userId);
  if (abortIfRunning(key)) {
    console.warn(
      `Aborted previous generation for ${key} (timestamp: ${payload.time})`,
    );
  }

  const abortController = new AbortController();
  register(key, abortController);

  const { aiResponse } = await generateResponse(conversation, abortController);
  if (abortController.signal.aborted) {
    console.warn(
      `Generation was aborted for ${key} (timestamp: ${payload.time}), skipping reply.`,
    );
    res.sendStatus(200);
    return;
  }
  unregister(key);

  if (
    !aiResponse ||
    aiResponse.trim() === "" ||
    aiResponse.includes(ASKED_FOR_HUMAN_RESPONSE)
  ) {
    res.sendStatus(200);
    return;
  }
  await conversation.updateOne({
    $push: { messages: { role: "assistant", content: aiResponse } },
  });

  try {
    const echo = await axios.post(
      `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_USER_ID}/messages`,
      {
        message: { text: aiResponse },
        recipient: { id: userId },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log(`(${echo.status}) Responded to ${userId} : "${aiResponse}"`);
  } catch (error) {
    console.error("Error sending Instagram message:", error);
  }

  res.sendStatus(200);
});

export default router;
