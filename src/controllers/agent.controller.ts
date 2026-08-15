import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { ConversationSchema } from "../models/Conversation.js";
import { HydratedDocument } from "mongoose";
import {
  allowedQuestions,
  ASKED_FOR_HUMAN_RESPONSE,
  companyInfo,
  conversationExamples,
  defaultIncreasePercent,
  frenchOnlyWords,
  frequentlyAskedQuestions,
  introduction,
  KILOWATT_PRICE_DINAR,
  MAX_PANEL_KILOWATT,
  MIN_PANEL_KILOWATT,
  MONO,
  PRICE_AGRI,
  TRI,
} from "../data/sparky.js";
import { calculateEnergyBill, estimateMonthlyKwh } from "../data/calculSteg.js";
import { anthropic } from "@ai-sdk/anthropic";

export async function generateResponse(
  conversation: HydratedDocument<ConversationSchema>,
  abortController: AbortController,
) {
  let aiResponse: string | null = null;
  try {
    const { text } = await generateText({
      // model: ollama("gpt-oss:120b-cloud"),
      model: anthropic("claude-haiku-4-5-20251001"),
      instructions: `Context:
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
When you call the "askForHuman" tool, you MUST pass a userMemory string summarizing all known facts about this customer: phone, address, property type, consumption/pump details, quote given, language, and any other useful notes. Omit unknown facts. Do not invent facts.

Task:
You will reply to the user's messages in a helpful and friendly manner, answering their questions, providing information about Sparky's services, and assisting them with any inquiries they have. 
Your first message in each conversation MUST start with the following statement: "${introduction}".

${
  conversation.userMemory?.trim()
    ? `
This is a returning customer. You already know the following facts from a previous conversation:
${conversation.userMemory}

This conversation is a NEW conversation (for example after a human agent handled them). Your first message MUST still start with "${introduction}".
Greet them as a returning customer. Do NOT refer to a previous chat transcript.
Do NOT re-ask qualifying questions that are already answered in the known facts above, unless the user is starting a new request that needs confirmation.
Use the known facts to tailor assistance.
`
    : ""
}

Here is a list of questions (in french, but you may adapt the language to the user's message) that you must ask the user to better understand their needs and provide accurate assistance:
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

Notes about electricity consumption:
Customers may answer with their consumption in kWh OR with their STEG bill amount in dinars (TND).
- If they give kWh: call "calculateEnergyBill" to estimate their STEG bill in dinars, tell them that estimated bill, then call "generateQuoteResidential" with that monthly kWh.
- If they give a bill amount in dinars, or do not know their kWh: ask follow-up questions ONE AT A TIME until you have all of: (1) bill amount in TND, (2) how many months the bill covers (1 = monthly, 2 = bimonthly, 3 = trimonthly, etc.), (3) wiring: monophasé (2 wires) or triphasé (4 wires), (4) main breaker (disjoncteur principal) in amperes.
  Then call "estimateMonthlyKwh". Use the returned kwh_month as their monthly consumption. Tell them the estimated monthly kWh, then call "generateQuoteResidential" with that kWh.
- Never invent bill amount, months, wires, or breaker. Never estimate kWh or STEG bill amounts yourself — always use the tools.
- If a tool returns an error (for example an unrecognized breaker), ask the user to correct the value. Valid monophasé breakers: ${Object.keys(MONO).join(", ")} A. Valid triphasé breakers: ${Object.keys(TRI).join(", ")} A.

Here is a list of frequently asked questions and their answers:
${JSON.stringify(frequentlyAskedQuestions, null, 2)}

Here are some examples of conversations between you and the user:
${conversationExamples.map((example) => example.map((message) => `${message.role}: ${message.content}`).join("\n")).join("\n\n")}
`,
      messages: [...conversation.messages],
      tools: {
        askForHuman: tool({
          description:
            "Use this tool to mark that the user has asked to talk to a human. This will prevent the assistant from replying and will alert a human agent to take over the conversation. Always pass a userMemory fact sheet of everything you know about this customer.",
          inputSchema: z.object({
            userMemory: z
              .string()
              .describe(
                "Known facts about this customer: phone, address, property type, consumption or pump details, quote given, language, and any other useful notes. Omit unknown facts. Do not invent facts.",
              ),
          }),
          execute: async ({ userMemory }) => {
            const askedForHuman = new Date();
            await conversation.updateOne({ askedForHuman, userMemory });
            conversation.askedForHuman = askedForHuman;
            conversation.userMemory = userMemory;
            return ASKED_FOR_HUMAN_RESPONSE;
          },
        }),

        calculateEnergyBill: tool({
          description:
            "Estimate the STEG electricity bill amount in TND for a given consumption in kWh. Use this when a residential customer provides their consumption in kWh. Do not estimate the bill yourself.",
          inputSchema: z.object({
            kwh: z.number().describe("Electricity consumption in kWh"),
          }),
          outputSchema: z.object({
            estimatedBillTnd: z.number(),
            error: z.string().optional(),
          }),
          execute: async ({ kwh }) => {
            if (kwh <= 0) {
              return {
                estimatedBillTnd: 0,
                error: "La consommation en kWh doit être positive.",
              };
            }
            return {
              estimatedBillTnd: Number(calculateEnergyBill(kwh).toFixed(3)),
            };
          },
        }),
        estimateMonthlyKwh: tool({
          description:
            "Estimate monthly electricity consumption in kWh from a STEG bill amount in dinars. Use this when a residential customer gives their bill amount instead of kWh. Collect bill amount, months covered, wiring, and main breaker first. Do not estimate kWh yourself.",
          inputSchema: z.object({
            billAmount: z
              .number()
              .describe("Bill amount in Tunisian dinars (TND)"),
            months: z
              .number()
              .describe(
                "Number of months the bill covers (1 monthly, 2 bimonthly, 3 trimonthly, etc.)",
              ),
            wires: z.number().describe("2 for monophasé, 4 for triphasé"),
            breaker: z
              .number()
              .describe(
                `Main breaker rating in amperes. Monophasé (wires=2): ${Object.keys(MONO).join(", ")}. Triphasé (wires=4): ${Object.keys(TRI).join(", ")}.`,
              ),
          }),
          outputSchema: z.object({
            kwh_month: z.number().optional(),
            power_kva: z.number().optional(),
            power_fee_ht: z.number().optional(),
            power_fee_ttc: z.number().optional(),
            total_power_fee_ttc: z.number().optional(),
            bill_without_debt: z.number().optional(),
            monthly_bill: z.number().optional(),
            exact: z.boolean().optional(),
            error: z.string().optional(),
          }),
          execute: async ({ billAmount, months, wires, breaker }) => {
            try {
              return estimateMonthlyKwh(billAmount, months, wires, breaker);
            } catch (error) {
              return {
                error: error instanceof Error ? error.message : String(error),
              };
            }
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
              averagePrice =
                PRICE_AGRI.LESS_THAN_4 + (wellDepthMoreThan100 as any) * 1000;
            } else if (wellPumpPowerInHp < 6) {
              averagePrice =
                PRICE_AGRI.LESS_THAN_6 + (wellDepthMoreThan100 as any) * 1000;
            } else if (wellPumpPowerInHp < 8) {
              averagePrice = PRICE_AGRI.LESS_THAN_8;
            } else if (wellPumpPowerInHp < 11) {
              averagePrice = PRICE_AGRI.LESS_THAN_11;
            } else {
              averagePrice = 0;
            }
            return {
              averagePrice,
            };
          },
        }),
      },
      stopWhen: stepCountIs(6),
      abortSignal: abortController.signal,
      temperature: 0.7,
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
