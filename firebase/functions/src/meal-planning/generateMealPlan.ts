import type { GenerateRecipesRequest, GenerateRecipesResponse } from "@grocery-deals/shared";
import { generateRecipesWithOpenAI } from "./openAiMealPlanClient.js";
import { normalizeWeeklyDealsForMealPlanning } from "./normalizeDeals.js";

export async function generateMealPlan(request: GenerateRecipesRequest): Promise<GenerateRecipesResponse> {
  const deals = normalizeWeeklyDealsForMealPlanning(request);

  if (deals.length === 0) {
    throw new Error("No eligible weekly deals were available for recipe generation.");
  }

  return generateRecipesWithOpenAI(request, deals);
}
