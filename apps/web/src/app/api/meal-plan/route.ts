import {
  MAX_RECIPES_PER_MEAL_TYPE,
  MIN_RECIPES_PER_MEAL_TYPE,
  RECIPE_SERVINGS,
  type GenerateRecipesRequest,
  type GenerateRecipesResponse,
  type GeneratedRecipe,
  type MealPlanDeal,
  type SaleItem,
  type SupportedStoreChain,
  type WeeklyAdDealSummary,
  type WeeklyDealsStoreResult,
} from "@grocery-deals/shared";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let recipesRequest: GenerateRecipesRequest;

  try {
    recipesRequest = validateRequest(body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid recipe generation request." },
      { status: 400 },
    );
  }

  try {
    if (process.env.MEAL_PLAN_ENDPOINT) {
      const upstream = await fetch(process.env.MEAL_PLAN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipesRequest),
      });
      const payload = await upstream.json();

      return Response.json(payload, { status: upstream.status });
    }

    return Response.json(buildMockResponse(recipesRequest));
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Recipe generation failed.",
      },
      { status: 500 },
    );
  }
}

function validateRequest(body: unknown): GenerateRecipesRequest {
  if (!isRecord(body) || !Array.isArray(body.stores) || !isRecord(body.weeklyDeals) || !isRecord(body.settings)) {
    throw new Error("Request body must include stores, weeklyDeals, and settings.");
  }

  if (!isRecipeCount(body.settings.lunchCount) || !isRecipeCount(body.settings.dinnerCount)) {
    throw new Error(
      `Recipe generation must request between ${MIN_RECIPES_PER_MEAL_TYPE} and ${MAX_RECIPES_PER_MEAL_TYPE} options per meal type.`,
    );
  }

  if (body.settings.lunchCount !== body.settings.dinnerCount) {
    throw new Error("Recipe generation must request the same number of lunch and dinner options.");
  }

  if (body.settings.servings !== RECIPE_SERVINGS || typeof body.settings.allowPantryStaples !== "boolean") {
    throw new Error("Recipe settings are invalid.");
  }

  return body as GenerateRecipesRequest;
}

function buildMockResponse(request: GenerateRecipesRequest): GenerateRecipesResponse {
  const deals = request.weeklyDeals.results.flatMap((result) => normalizeStoreResult(result));
  const dealIndex = Object.fromEntries(deals.map((deal) => [deal.dealId, deal]));
  const fallbackDeals = deals.length ? deals : [buildFallbackDeal(request.stores[0]?.company ?? "kroger", request.stores[0]?.storeId ?? "00000000")];
  const recipes = [
    ...Array.from({ length: request.settings.lunchCount }, (_, index) => buildMockRecipe("lunch", index, fallbackDeals, request.settings.allowPantryStaples)),
    ...Array.from({ length: request.settings.dinnerCount }, (_, index) => buildMockRecipe("dinner", index, fallbackDeals, request.settings.allowPantryStaples)),
  ];

  return {
    generatedAt: new Date().toISOString(),
    recipes,
    dealIndex: Object.keys(dealIndex).length ? dealIndex : { [fallbackDeals[0].dealId]: fallbackDeals[0] },
  };
}

function normalizeStoreResult(result: WeeklyDealsStoreResult): MealPlanDeal[] {
  if (result.status !== "succeeded") return [];

  return result.deals.map((deal, index) => normalizeDeal(deal, result.company, result.storeId, index)).filter(Boolean);
}

function normalizeDeal(
  deal: SaleItem | WeeklyAdDealSummary,
  company: SupportedStoreChain,
  storeId: string,
  index: number,
): MealPlanDeal {
  const productName = "productName" in deal ? deal.productName : deal.name;
  const priceText = "productName" in deal ? deal.salePriceText : deal.price;

  return {
    dealId: `${company}:${storeId}:${index}:${slugify(productName)}`,
    company,
    storeId,
    productName,
    priceText,
    salePrice: "productName" in deal ? deal.salePrice : undefined,
    regularPriceText: "productName" in deal ? deal.regularPriceText : undefined,
    regularPrice: "productName" in deal ? deal.regularPrice : undefined,
    savingsAmount: "productName" in deal ? deal.savingsAmount : undefined,
    discountType: "productName" in deal ? deal.discountType : "unknown",
    category: deal.category,
    requiresLoyalty: "productName" in deal ? deal.requiresLoyalty : undefined,
    requiresDigitalCoupon: "productName" in deal ? deal.requiresDigitalCoupon : undefined,
    source: "weekly_ad",
  };
}

function buildMockRecipe(
  mealType: GeneratedRecipe["mealType"],
  index: number,
  deals: MealPlanDeal[],
  allowPantryStaples: boolean,
): GeneratedRecipe {
  const primaryDeal = deals[index % deals.length];
  const secondaryDeal = deals[(index + 5) % deals.length];
  const pantryIngredients = allowPantryStaples
    ? [
        {
          name: "Olive oil",
          quantity: "1 tbsp",
          dealId: null,
          company: null,
          storeId: null,
          isPantryStaple: true,
        },
        {
          name: "Salt and pepper",
          quantity: "to taste",
          dealId: null,
          company: null,
          storeId: null,
          isPantryStaple: true,
        },
      ]
    : [];

  return {
    id: `${mealType}-${index + 1}`,
    mealType,
    title: `${capitalize(mealType)} ${index + 1}: ${primaryDeal.productName}`,
    summary: `A quick ${mealType} idea using ${primaryDeal.productName}${secondaryDeal.dealId !== primaryDeal.dealId ? ` with ${secondaryDeal.productName}` : ""}.`,
    expectedSavings: `Built around ${primaryDeal.priceText ?? "a weekly ad deal"} from ${formatCompany(primaryDeal.company)}.`,
    dealIdsUsed: Array.from(new Set([primaryDeal.dealId, secondaryDeal.dealId])),
    ingredients: [
      {
        name: primaryDeal.productName,
        quantity: "1 package",
        dealId: primaryDeal.dealId,
        company: primaryDeal.company,
        storeId: primaryDeal.storeId,
        isPantryStaple: false,
      },
      {
        name: secondaryDeal.productName,
        quantity: "as needed",
        dealId: secondaryDeal.dealId,
        company: secondaryDeal.company,
        storeId: secondaryDeal.storeId,
        isPantryStaple: false,
      },
      ...pantryIngredients,
    ],
    instructions: [
      `Prepare ${primaryDeal.productName} according to package needs.`,
      secondaryDeal.dealId !== primaryDeal.dealId
        ? `Combine with ${secondaryDeal.productName} and season to taste.`
        : "Season and portion for two servings.",
      "Serve warm or pack for later.",
    ],
  };
}

function buildFallbackDeal(company: SupportedStoreChain, storeId: string): MealPlanDeal {
  return {
    dealId: `${company}:${storeId}:0:weekly-ad-item`,
    company,
    storeId,
    productName: "Weekly ad item",
    priceText: "Sale price",
    discountType: "unknown",
    source: "weekly_ad",
  };
}

function formatCompany(company: string): string {
  return company
    .split("-")
    .map((part) => capitalize(part))
    .join(" ");
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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
