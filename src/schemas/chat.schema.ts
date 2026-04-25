import { z } from "zod";

const messageContentSchema = z.object({ type: "text", text: z.string() });

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: messageContentSchema,
});

export const chatSchema = z.object({
  message: messageSchema,
  history: z.array(messageSchema),
});
