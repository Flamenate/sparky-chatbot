import { z } from "zod";

const whatsappProfileSchema = z
  .object({
    name: z.string(),
    username: z.string().optional(),
  })
  .strict();

const whatsappContactSchema = z
  .object({
    profile: whatsappProfileSchema,
    wa_id: z.string(),
    user_id: z.string().optional(),
    parent_user_id: z.string().optional(),
  })
  .strict();

const whatsappTextMessageSchema = z
  .object({
    body: z.string(),
  })
  .strict();

const whatsappMessageSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(),
    type: z.literal("text"),
    text: whatsappTextMessageSchema,
    from_user_id: z.string().optional(),
    from_parent_user_id: z.string().optional(),
  })
  .strict();

const whatsappValueSchema = z
  .object({
    messaging_product: z.literal("whatsapp"),
    metadata: z
      .object({
        display_phone_number: z.string(),
        phone_number_id: z.string(),
      })
      .strict(),
    contacts: z.array(whatsappContactSchema),
    messages: z.array(whatsappMessageSchema),
  })
  .strict();

export const whatsappWebhookSchema = z
  .object({
    object: z.literal("whatsapp_business_account"),
    entry: z.array(
      z
        .object({
          id: z.string(),
          changes: z.array(
            z
              .object({
                field: z.literal("messages"),
                value: whatsappValueSchema,
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export type WhatsAppWebhookPayload = z.infer<typeof whatsappWebhookSchema>;
