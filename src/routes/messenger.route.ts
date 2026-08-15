import express, { Router, Request, Response } from "express";
import { verifyRequestSignature } from "../middleware/validation.middleware.js";
import { verifyMetaWebhook } from "../utils/meta.js";
import axios from "axios";
import { generateResponse } from "../controllers/agent.controller.js";
import Conversation from "../models/Conversation.js";
import {
  generationKey,
  abortIfRunning,
  unregister,
  register,
} from "../utils/generationRegistry.js";
import {
  MessengerWebhookPayload,
  messengerWebhookSchema,
} from "../schemas/messenger.schema.js";
import { ASKED_FOR_HUMAN_RESPONSE } from "../data/sparky.js";
import {
  isHumanAidPaused,
  resumeAfterHumanAidIfNeeded,
} from "../utils/humanAid.js";

const router = Router();
router.use(express.json({ verify: verifyRequestSignature }));

/**
 * GET /webhook — Meta webhook verification.
 */
router.get("/", verifyMetaWebhook);

//Always send 200 response to avoid webhook retries, even if we encounter an error processing the message
router.post("/", async (req: Request, res: Response) => {
  try {
    messengerWebhookSchema.parse(req.body);
  } catch (error) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }
  const timestamp = new Date().toISOString();
  const payload = (req.body as MessengerWebhookPayload).entry[0];
  const userId = payload.messaging[0].sender.id;
  const message = payload.messaging[0].message;
  if (message.attachments && message.attachments.length > 0) {
    console.log(
      `[${timestamp}] Received message with attachments, which are not supported. Ignoring.`,
    );
    res.sendStatus(200);
    return;
  }
  const conversation = await Conversation.findOneAndUpdate(
    {
      userId,
      platform: "messenger",
    },
    {
      $push: {
        messages: {
          role: "user",
          content: message.text,
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (isHumanAidPaused(conversation)) {
    console.log(
      `[${timestamp}]`,
      `Skipping reply to ${userId} because they asked for human help less than 12 hours ago.`,
    );
    res.sendStatus(200);
    return;
  }
  await resumeAfterHumanAidIfNeeded(conversation);
  console.log(
    `[${timestamp}] Received Messenger message from ${userId}: "${message.text}"`,
  );
  try {
    await axios.post(
      `https://graph.facebook.com/v25.0/${process.env.META_PAGE_ID}/messages`,
      {
        recipient: {
          id: userId,
        },
        sender_action: "mark_seen",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    await axios.post(
      `https://graph.facebook.com/v25.0/${process.env.META_PAGE_ID}/messages`,
      {
        recipient: {
          id: userId,
        },
        sender_action: "typing_on",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error sending Messenger seen/typing indicator:", error);
  }
  const key = generationKey("messenger", userId);
  if (abortIfRunning(key)) {
    console.warn(
      `[${timestamp}]`,
      `Aborted previous generation for ${key} (timestamp: ${payload.time})`,
    );
  }

  const abortController = new AbortController();
  register(key, abortController);

  const { aiResponse } = await generateResponse(conversation, abortController);
  if (abortController.signal.aborted) {
    console.warn(
      `[${timestamp}]`,
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
      `https://graph.facebook.com/v25.0/${process.env.META_PAGE_ID}/messages`,
      {
        message: { text: aiResponse },
        recipient: { id: userId },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log(`[${timestamp}] (${echo.status}) Responded to ${userId}.`);
  } catch (error) {
    console.error(`[${timestamp}] Error sending Messenger message:`, error);
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v25.0/${process.env.META_PAGE_ID}/messages`,
      {
        recipient: {
          id: userId,
        },
        sender_action: "typing_off",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      `[${timestamp}] Error retracting Messenger typing indicator:`,
      error,
    );
  }
  console.log(`[${timestamp}] Responded to ${userId}.`);

  res.sendStatus(200);
});

export default router;
