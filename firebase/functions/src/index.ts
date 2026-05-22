import { onRequest } from "firebase-functions/v2/https";
import { scrapeKrogerWeeklyAdByStoreId } from "./scrapers/chains/kroger.js";
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

    if (brand !== "kroger") {
      response.status(400).json({ error: 'Only brand "kroger" is supported by this POC.' });
      return;
    }

    if (!storeId) {
      response.status(400).json({ error: "storeId is required." });
      return;
    }

    try {
      const result = await scrapeKrogerWeeklyAdByStoreId(storeId);
      response.json({ deals: result.deals });
    } catch (error) {
      response.status(500).json({
        brand: "kroger",
        storeId,
        error: error instanceof Error ? error.message : "Unknown scraper error.",
      });
    }
  },
);

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
