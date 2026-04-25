import { z } from "zod";

const messengerMessageSchema = z
  .object({
    mid: z.string(),
    text: z.string(),
    attachments: z.array(z.any()).optional()
  })
  .strict();

const messengerMessagingSchema = z
  .object({
    sender: z.object({ id: z.string() }).strict(),
    recipient: z.object({ id: z.string() }).strict(),
    timestamp: z.number(),
    message: messengerMessageSchema,
  })
  .strict();

const messengerEntrySchema = z
  .object({
    time: z.number(),
    id: z.string(),
    messaging: z.array(messengerMessagingSchema),
  })
  .strict();

export const messengerWebhookSchema = z
  .object({
    object: z.literal("page"),
    entry: z.array(messengerEntrySchema),
  })
  .strict();

export type MessengerWebhookPayload = z.infer<typeof messengerWebhookSchema>;
