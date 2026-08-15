import express, { Router, Request, Response } from "express";
import { verifyRequestSignature } from "../middleware/validation.middleware.js";
import {
  WhatsAppWebhookPayload,
  whatsappWebhookSchema,
} from "../schemas/whatsapp.schema.js";
import axios from "axios";
import { verifyMetaWebhook } from "../utils/meta.js";
import Conversation from "../models/Conversation.js";
import { generateResponse } from "../controllers/agent.controller.js";
import {
  abortIfRunning,
  generationKey,
  register,
  unregister,
} from "../utils/generationRegistry.js";
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

//TODO: handle attachments
router.post("/", async (req: Request, res: Response) => {
  try {
    whatsappWebhookSchema.parse(req.body);
  } catch (error) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const timestamp = new Date().toISOString();
  const payload = (req.body as WhatsAppWebhookPayload).entry[0].changes[0]
    .value;
  const userId = payload.messages[0].from;
  const conversation = await Conversation.findOneAndUpdate(
    {
      userId,
      platform: "whatsapp",
    },
    {
      $push: {
        messages: {
          role: "user",
          content: payload.messages[0].text.body,
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
  try {
    await axios.post(
      `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_SENDER_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: payload.messages[0].id,
        typing_indicator: {
          type: "text",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error sending WhatsApp read receipt:", error);
  }

  const key = generationKey("whatsapp", userId);
  if (abortIfRunning(key)) {
    console.warn(
      `[${timestamp}]`,
      `Aborted previous generation for ${key} (timestamp: ${payload.messages[0].timestamp})`,
    );
  }

  const abortController = new AbortController();
  register(key, abortController);

  const { aiResponse } = await generateResponse(conversation, abortController);
  if (abortController.signal.aborted) {
    console.warn(
      `[${timestamp}]`,
      `Generation was aborted for ${key} (timestamp: ${payload.messages[0].timestamp}), skipping reply.`,
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
      `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_SENDER_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: payload.messages[0].from,
        type: "text",
        text: {
          preview_url: false,
          body: aiResponse,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log(`[${timestamp}] (${echo.status}) Responded to ${userId}."`);
    res.sendStatus(200);
  } catch (error) {
    console.error(`[${timestamp}] Error sending WhatsApp message:`, error);
    res.sendStatus(500);
  }
});

export default router;
