import type { MealPlanRequest } from "@grocery-deals/shared";

export function createMealPlanPrompt(request: MealPlanRequest): string {
  return [
    "Create a practical weekly meal plan using the available grocery sale items.",
    `Days: ${request.days}`,
    `Store count: ${request.stores.length}`,
    `Sale item count: ${request.saleItems.length}`,
  ].join("\n");
}
