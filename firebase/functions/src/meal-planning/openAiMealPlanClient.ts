import type { GenerateRecipesRequest, GenerateRecipesResponse, MealPlanDeal } from "@grocery-deals/shared";
import { getOpenAiApiKey } from "../openai/client.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4";

export async function generateRecipesWithOpenAI(
  request: GenerateRecipesRequest,
  deals: MealPlanDeal[],
): Promise<GenerateRecipesResponse> {
  const promptId = process.env.OPENAI_MEAL_PLAN_PROMPT_ID;

  if (!promptId) {
    throw new Error("OPENAI_MEAL_PLAN_PROMPT_ID is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MEAL_PLAN_MODEL || DEFAULT_MODEL,
      prompt: buildPrompt(promptId, request, deals),
      reasoning: {
        effort: "low",
      },
      text: {
        verbosity: "low",
        format: mealPlanResponseFormat(),
      },
      store: false,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(formatOpenAiError(payload));
  }

  const text = extractOutputText(payload);
  const parsed = JSON.parse(text) as GenerateRecipesResponse;

  return {
    ...parsed,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    dealIndex: Object.fromEntries(deals.map((deal) => [deal.dealId, deal])),
  };
}

function buildPrompt(promptId: string, request: GenerateRecipesRequest, deals: MealPlanDeal[]) {
  const prompt: {
    id: string;
    version?: string;
    variables: Record<string, string>;
  } = {
    id: promptId,
    variables: {
      stores_json: JSON.stringify(request.stores),
      deals_json: JSON.stringify(deals),
      settings_json: JSON.stringify(request.settings),
    },
  };

  if (process.env.OPENAI_MEAL_PLAN_PROMPT_VERSION) {
    prompt.version = process.env.OPENAI_MEAL_PLAN_PROMPT_VERSION;
  }

  return prompt;
}

function mealPlanResponseFormat() {
  return {
    type: "json_schema",
    name: "generate_recipes_response",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["generatedAt", "recipes", "dealIndex"],
      properties: {
        generatedAt: { type: "string" },
        dealIndex: {
          type: "object",
          additionalProperties: false,
          properties: {},
          required: [],
        },
        recipes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "mealType",
              "title",
              "summary",
              "ingredients",
              "instructions",
              "expectedSavings",
              "dealIdsUsed",
            ],
            properties: {
              id: { type: "string" },
              mealType: { type: "string", enum: ["lunch", "dinner"] },
              title: { type: "string" },
              summary: { type: "string" },
              expectedSavings: { type: "string" },
              dealIdsUsed: {
                type: "array",
                items: { type: "string" },
              },
              instructions: {
                type: "array",
                items: { type: "string" },
              },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "quantity", "dealId", "company", "storeId", "isPantryStaple"],
                  properties: {
                    name: { type: "string" },
                    quantity: { type: ["string", "null"] },
                    dealId: { type: ["string", "null"] },
                    company: { type: ["string", "null"] },
                    storeId: { type: ["string", "null"] },
                    isPantryStaple: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.output)) {
    throw new Error("OpenAI response did not include output.");
  }

  for (const output of payload.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;

    for (const content of output.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI response did not include output text.");
}

function formatOpenAiError(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  return "OpenAI recipe generation failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
