import { onRequest } from "firebase-functions/v2/https";
import type { GroceryBrand } from "@grocery-deals/shared";
import { generateMealPlan as generateRecipes } from "./meal-planning/generateMealPlan.js";
import { validateGenerateRecipesRequest } from "./meal-planning/validateGenerateRecipesRequest.js";
import { scrapeKrogerFamilyWeeklyAd } from "./scrapers/chains/kroger.js";
import { getWeeklyDeals as coordinateWeeklyDeals, validateWeeklyDealsRequest } from "./scrapers/getWeeklyDeals.js";

export const scrapeRuns = onRequest(
  {
    cors: true,
    memory: "2GiB",
    timeoutSeconds: 120,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Use POST." });
      return;
    }

    const brand = request.body?.brand;
    const storeId = String(request.body?.storeId ?? "").trim();

    if (!isKrogerFamilyBrand(brand)) {
      response.status(400).json({
        error: 'Only Kroger-family brands "kroger", "marianos", "fred-meyer", "qfc", and "ralphs" are supported by this POC.',
      });
      return;
    }

    if (!storeId) {
      response.status(400).json({ error: "storeId is required." });
      return;
    }

    try {
      const result = await scrapeKrogerFamilyWeeklyAd({
        brand,
        displayName: KROGER_FAMILY_BRANDS[brand].displayName,
        storeId,
        sourceUrl: KROGER_FAMILY_BRANDS[brand].sourceUrl,
      });
      response.json({ deals: result.deals });
    } catch (error) {
      response.status(500).json({
        brand,
        storeId,
        error: error instanceof Error ? error.message : "Unknown scraper error.",
      });
    }
  },
);

const KROGER_FAMILY_BRANDS = {
  "fred-meyer": { displayName: "Fred Meyer", sourceUrl: "https://www.fredmeyer.com/weeklyad" },
  kroger: { displayName: "Kroger", sourceUrl: "https://www.kroger.com/weeklyad" },
  marianos: { displayName: "Mariano's", sourceUrl: "https://www.marianos.com/weeklyad" },
  qfc: { displayName: "QFC", sourceUrl: "https://www.qfc.com/weeklyad" },
  ralphs: { displayName: "Ralphs", sourceUrl: "https://www.ralphs.com/weeklyad" },
} satisfies Partial<Record<GroceryBrand, { displayName: string; sourceUrl: string }>>;

function isKrogerFamilyBrand(brand: unknown): brand is keyof typeof KROGER_FAMILY_BRANDS {
  return typeof brand === "string" && brand in KROGER_FAMILY_BRANDS;
}

export const getWeeklyDeals = onRequest(
  {
    cors: true,
    memory: "2GiB",
    timeoutSeconds: 120,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Use POST." });
      return;
    }

    try {
      const weeklyDealsRequest = validateWeeklyDealsRequest(request.body);
      const result = await coordinateWeeklyDeals(weeklyDealsRequest);
      response.json(result);
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Invalid weekly deals request.",
      });
    }
  },
);

export const generateMealPlan = onRequest(
  {
    cors: true,
    memory: "1GiB",
    secrets: ["OPENAI_API_KEY"],
    timeoutSeconds: 300,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Use POST." });
      return;
    }

    try {
      const mealPlanRequest = validateGenerateRecipesRequest(request.body);
      const result = await generateRecipes(mealPlanRequest);
      response.json(result);
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Invalid recipe generation request.",
      });
    }
  },
);
