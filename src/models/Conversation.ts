import { Schema, model } from "mongoose";

/** Sentinel date meaning human aid is not active (never asked, or cooldown already consumed). */
export const HUMAN_AID_INACTIVE_DATE = new Date("2020-01-01");

export type ConversationSchema = {
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  platform: "whatsapp" | "messenger" | "instagram";
  askedForHuman: Date;
  userMemory: string;
};

const schema = new Schema<ConversationSchema>({
  userId: { type: String, required: true },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant"] },
      content: String,
      _id: false,
    },
  ],
  platform: {
    type: String,
    enum: ["whatsapp", "messenger", "instagram"],
    required: true,
  },
  askedForHuman: {
    type: Date,
    default: () => new Date(HUMAN_AID_INACTIVE_DATE),
  },
  userMemory: { type: String, default: "" },
});

schema.virtual("hoursSinceAskedForHuman").get(function (
  this: ConversationSchema,
) {
  const diff = new Date().getTime() - this.askedForHuman.getTime();
  return diff / (1000 * 60 * 60);
});

const Conversation = model("Conversation", schema);
export default Conversation;
