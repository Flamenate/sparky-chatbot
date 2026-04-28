import { ollama } from "ai-sdk-ollama";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { ConversationSchema } from "../models/Conversation";
import { HydratedDocument } from "mongoose";
import {
  allowedQuestions,
  ASKED_FOR_HUMAN_RESPONSE,
  companyInfo,
  conversationExamples,
  defaultIncreasePercent,
  frenchOnlyWords,
  KILOWATT_PRICE_DINAR,
  MAX_PANEL_KILOWATT,
  MIN_PANEL_KILOWATT,
} from "../data/sparky";

export async function generateResponse(
  conversation: HydratedDocument<ConversationSchema>,
  abortController: AbortController,
) {
  let aiResponse: string | null = null;
  try {
    const { text } = await generateText({
      model: ollama("gpt-oss:120b-cloud"),
      system: `Context:
You are a friendly commercial customer service assistant.
You do NOT use markdown in your responses at all.
You talk in French or in "Tunisian dialect" only. Make sure to respond in the language of the user's most recent message. If it's French, you speak French. If it's Tunisian dialect, you speak Tunisian dialect. 
For your responses in the Tunisian dialect, always use the arabic alphabet, not latin with numbers, even if the user is using the dialect with latin. 
For the following words, always say them in French (even if the entire response is not in French):
${frenchOnlyWords.join("\n")}

You work for a company called 'Sparky'. Sparky is a Tunisian company that replaces traditional electricity setups with solar panels.
Sparky's motto is 'Let the sun pay your electricity bill'. They offer their services in all of Tunisia.
Their contact information is as follows:
${JSON.stringify(companyInfo, null, 2)}

You do not offer after-sales services. If the user asks for after-sales services, call the "askForHuman" tool instantly.
IF AT ANY POINT DURING THE CONVERSATION THE USER ASKS TO TALK TO A REAL PERSON OR A MANAGER, CALL THE "askForHuman" TOOL IMMEDIATELY AND RESPOND WITH ${ASKED_FOR_HUMAN_RESPONSE}.

Task:
You will reply to the user's messages in a helpful and friendly manner, answering their questions, providing information about Sparky's services, and assisting them with any inquiries they have. Here is a list of questions that you must ask the user to better understand their needs and provide accurate assistance:
  ${JSON.stringify(allowedQuestions, null, 2)}

Do NOT ask more than one question per message.
If the user has already provided an answer to a question, do not ask it again.
If you can infer the answer to a question based on the user's messages, do not ask it again and use the inferred answer to provide accurate assistance. (example: if a user says they want to install solar panels on their field or to power their well pump, you can infer that their property is agricultural)
(example: if a user says they want to install solar panels for their home, you can infer that the property type is residential)
If the user's property is commercial, ONLY ask them to provide their phone number. Once they do, call the "askForHuman" tool and respond with ${ASKED_FOR_HUMAN_RESPONSE}.
Always use the information provided by the user to tailor your responses and provide accurate assistance.

When the user first engages the conversation, if they just say Hi, don't start asking questions right away. Instead, offer help.

Your objective is to generate a quote for the customer based on their needs and requirements. For this purpose, you will use the "generateQuoteResidential" tool if the property type is residential, or the "generateQuoteAgricultural" tool if the property type is agricultural.
You are NOT allowed to estimate prices yourself without calling the tool.
You are NOT allowed to mention the tool to the user. It is for internal use only.
Specify to the user that the generated quote is a preliminary estimation and that a human agent will contact them to provide a more accurate quote after analyzing their needs in more detail.
Once you call the adequate tool to generate the quote, ask for the customer's phone number if you haven't already, and then call the "askForHuman" tool to alert a human agent to take over the conversation then respond with "${ASKED_FOR_HUMAN_RESPONSE}".

Here are some examples of conversations between you and the user:
${conversationExamples.map((example) => example.map((message) => `${message.role}: ${message.content}`).join("\n")).join("\n\n")}
`,
      messages: [...conversation.messages],
      tools: {
        askForHuman: tool({
          description:
            "Use this tool to mark that the user has asked to talk to a human. This will prevent the assistant from replying and will alert a human agent to take over the conversation.",
          inputSchema: z.object({}),
          execute: async () => {
            await conversation.updateOne({ askedForHuman: new Date() });
            return ASKED_FOR_HUMAN_RESPONSE;
          },
        }),

        generateQuoteResidential: tool({
          description:
            "Use this tool to generate a quote for the customer based on their average monthly electricity usage. Always use this tool to generate quotes, do NOT estimate prices yourself without calling this tool.",
          inputSchema: z.object({
            averageMonthlyWattUsage: z.number(),
          }),
          outputSchema: z.object({
            minPrice: z.number(),
            maxPrice: z.number(),
            minNumberOfPanels: z.number().optional(),
            maxNumberOfPanels: z.number().optional(),
          }),
          execute: async ({ averageMonthlyWattUsage }) => {
            const yearlyKwhUsage =
              (averageMonthlyWattUsage * (1 + defaultIncreasePercent) * 12) /
              1600;
            const minPanels = Math.ceil(yearlyKwhUsage / MIN_PANEL_KILOWATT);
            const maxPanels = Math.floor(yearlyKwhUsage / MAX_PANEL_KILOWATT);
            const minPrice = minPanels * KILOWATT_PRICE_DINAR;
            const maxPrice = maxPanels * KILOWATT_PRICE_DINAR;
            return {
              minPrice,
              maxPrice,
              minNumberOfPanels: minPanels,
              maxNumberOfPanels: maxPanels,
            };
          },
        }),
        generateQuoteAgricultural: tool({
          description:
            "Use this tool to generate a quote for the customer based on their well pump power and depth. Always use this tool to generate quotes, do NOT estimate prices yourself without calling this tool. If the average price is 0, it means that we cannot estimate.",
          inputSchema: z.object({
            wellPumpPowerInHp: z.number(),
            wellDepthMoreThan100: z.boolean().default(true),
          }),
          outputSchema: z.object({
            averagePrice: z.number(),
          }),
          execute: async ({ wellPumpPowerInHp, wellDepthMoreThan100 }) => {
            let averagePrice: number;
            if (wellPumpPowerInHp < 4) {
              averagePrice = 7800 + (wellDepthMoreThan100 as any) * 1000;
            } else if (wellPumpPowerInHp < 6) {
              averagePrice = 10300 + (wellDepthMoreThan100 as any) * 1000;
            } else if (wellPumpPowerInHp < 8) {
              averagePrice = 14000;
            } else if (wellPumpPowerInHp < 11) {
              averagePrice = 18000;
            } else {
              averagePrice = 0;
            }
            return {
              averagePrice,
            };
          },
        }),
      },
      stopWhen: stepCountIs(5),
      abortSignal: abortController.signal,
    });
    aiResponse = text;
  } catch (error) {
    console.error(
      `Error generating AI response (conv_id ${conversation._id}):`,
      error,
    );
  }
  return { aiResponse, attachments: [] };
}
