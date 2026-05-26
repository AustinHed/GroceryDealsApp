import {
  type GenerateRecipesRequest,
  type SupportedStoreChain,
  type WeeklyDealsResponse,
  type WeeklyDealsStoreInput,
} from "@grocery-deals/shared";

const MAX_NEARBY_STORES = 3;
const MIN_RECIPES_PER_MEAL_TYPE = 1;
const MAX_RECIPES_PER_MEAL_TYPE = 14;
const RECIPE_SERVINGS = 2;
const KROGER_FAMILY_CHAINS: readonly SupportedStoreChain[] = [
  "kroger",
  "marianos",
  "fred-meyer",
  "qfc",
  "ralphs",
];

export function validateGenerateRecipesRequest(body: unknown): GenerateRecipesRequest {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object.");
  }

  const stores = validateStores(body.stores);
  const weeklyDeals = validateWeeklyDeals(body.weeklyDeals);
  const settings = validateSettings(body.settings);

  const successfulDealCount = weeklyDeals.results.reduce((total, result) => {
    return result.status === "succeeded" ? total + result.dealCount : total;
  }, 0);

  if (successfulDealCount === 0) {
    throw new Error("At least one successful weekly deal is required to generate recipes.");
  }

  return {
    stores,
    weeklyDeals,
    settings,
  };
}

function validateStores(value: unknown): WeeklyDealsStoreInput[] {
  if (!Array.isArray(value)) {
    throw new Error("stores must be an array.");
  }

  if (value.length === 0) {
    throw new Error("At least one store is required.");
  }

  if (value.length > MAX_NEARBY_STORES) {
    throw new Error(`A maximum of ${MAX_NEARBY_STORES} stores can be requested.`);
  }

  return value.map((store, index) => {
    if (!isRecord(store)) {
      throw new Error(`Store at index ${index} must be an object.`);
    }

    const company = String(store.company ?? "").trim();
    const storeId = String(store.storeId ?? "").trim();

    if (!KROGER_FAMILY_CHAINS.includes(company as SupportedStoreChain)) {
      throw new Error(`Store at index ${index} must be a Kroger-family chain.`);
    }

    if (!storeId) {
      throw new Error(`Store at index ${index} is missing storeId.`);
    }

    return {
      company: company as SupportedStoreChain,
      storeId,
    };
  });
}

function validateWeeklyDeals(value: unknown): WeeklyDealsResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("weeklyDeals must include a results array.");
  }

  return value as WeeklyDealsResponse;
}

function validateSettings(value: unknown): GenerateRecipesRequest["settings"] {
  if (!isRecord(value)) {
    throw new Error("settings must be an object.");
  }

  if (!isRecipeCount(value.lunchCount) || !isRecipeCount(value.dinnerCount)) {
    throw new Error(
      `Recipe generation must request between ${MIN_RECIPES_PER_MEAL_TYPE} and ${MAX_RECIPES_PER_MEAL_TYPE} options per meal type.`,
    );
  }

  if (value.lunchCount !== value.dinnerCount) {
    throw new Error("Recipe generation must request the same number of lunch and dinner options.");
  }

  if (value.servings !== RECIPE_SERVINGS) {
    throw new Error(`Recipe generation must use ${RECIPE_SERVINGS} servings.`);
  }

  if (typeof value.allowPantryStaples !== "boolean") {
    throw new Error("settings.allowPantryStaples must be a boolean.");
  }

  return {
    lunchCount: value.lunchCount,
    dinnerCount: value.dinnerCount,
    servings: RECIPE_SERVINGS,
    allowPantryStaples: value.allowPantryStaples,
  };
}

function isRecipeCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RECIPES_PER_MEAL_TYPE &&
    value <= MAX_RECIPES_PER_MEAL_TYPE
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
