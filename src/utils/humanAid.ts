import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { HydratedDocument } from "mongoose";
import {
  ConversationSchema,
  HUMAN_AID_INACTIVE_DATE,
} from "../models/Conversation.js";

const HUMAN_AID_PAUSE_HOURS = 12;

function isRealHandoff(askedForHuman: Date): boolean {
  return askedForHuman.getTime() > HUMAN_AID_INACTIVE_DATE.getTime();
}

export function isHumanAidPaused(
  conversation: HydratedDocument<ConversationSchema>,
): boolean {
  if (!isRealHandoff(conversation.askedForHuman)) {
    return false;
  }
  const hours = conversation.get("hoursSinceAskedForHuman") as number;
  return hours < HUMAN_AID_PAUSE_HOURS;
}

function isHumanAidExpired(
  conversation: HydratedDocument<ConversationSchema>,
): boolean {
  if (!isRealHandoff(conversation.askedForHuman)) {
    return false;
  }
  const hours = conversation.get("hoursSinceAskedForHuman") as number;
  return hours >= HUMAN_AID_PAUSE_HOURS;
}

async function extractUserMemory(
  conversation: HydratedDocument<ConversationSchema>,
): Promise<string> {
  const transcript = conversation.messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      instructions: `Extract a concise fact sheet about this customer from the conversation. Include: name if known, phone, address, property type (agricultural/residential/commercial), consumption or pump details, any quote given, language preference, and other useful notes. If a fact is unknown, omit it. Write in French. Do not invent facts.`,
      prompt: transcript || "(empty conversation)",
    });
    return text.trim();
  } catch (error) {
    console.error(
      `Error extracting user memory (conv_id ${conversation._id}):`,
      error,
    );
    return conversation.userMemory ?? "";
  }
}

export async function resumeAfterHumanAidIfNeeded(
  conversation: HydratedDocument<ConversationSchema>,
): Promise<void> {
  if (!isHumanAidExpired(conversation)) {
    return;
  }

  if (!conversation.userMemory?.trim()) {
    conversation.userMemory = await extractUserMemory(conversation);
  }

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  conversation.messages = lastMessage ? [lastMessage] : [];
  conversation.askedForHuman = new Date(HUMAN_AID_INACTIVE_DATE);
  await conversation.save();
}
