import { z } from "zod";

const instagramMessageSchema = z
  .object({
    mid: z.string(),
    text: z.string(),
  })
  .strict();

const instagramMessagingSchema = z
  .object({
    sender: z.object({ id: z.string() }).strict(),
    recipient: z.object({ id: z.string() }).strict(),
    timestamp: z.number(),
    message: instagramMessageSchema,
  })
  .strict();

const instagramEntrySchema = z
  .object({
    time: z.number(),
    id: z.string(),
    messaging: z.array(instagramMessagingSchema),
  })
  .strict();

export const instagramWebhookSchema = z
  .object({
    object: z.literal("instagram"),
    entry: z.array(instagramEntrySchema),
  })
  .strict();

export type InstagramWebhookPayload = z.infer<typeof instagramWebhookSchema>;
