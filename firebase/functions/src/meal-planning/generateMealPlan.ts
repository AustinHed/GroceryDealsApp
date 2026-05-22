import type { MealPlanRequest, MealPlanResponse } from "@grocery-deals/shared";
import { createMealPlanPrompt } from "../openai/prompts.js";

export async function generateMealPlan(request: MealPlanRequest): Promise<MealPlanResponse> {
  const prompt = createMealPlanPrompt(request);

  // Future implementation: call OpenAI with the prompt and parse a structured response.
  void prompt;

  return {
    overview: "",
    days: [],
    shoppingNotes: [],
  };
}
