import { Schema, model } from "mongoose";

export type ConversationSchema = {
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  platform: "whatsapp" | "messenger";
  askedForHuman: Date;
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
  platform: { type: String, enum: ["whatsapp", "messenger"], required: true },
  askedForHuman: { type: Date, default: new Date("2020-01-01") },
});

schema.virtual("hoursSinceAskedForHuman").get(function (
  this: ConversationSchema,
) {
  const diff = new Date().getTime() - this.askedForHuman.getTime();
  return diff / (1000 * 60 * 60);
});

const Conversation = model("Conversation", schema);
export default Conversation;
