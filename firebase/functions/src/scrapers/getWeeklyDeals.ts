import {
  MAX_NEARBY_STORES,
  type NearbyStore,
  type SaleItem,
  type SupportedStoreChain,
  type WeeklyDealsRequest,
  type WeeklyDealsResponse,
  type WeeklyDealsStoreInput,
  type WeeklyDealsStoreResult,
} from "@grocery-deals/shared";
import { scrapeAldiWeeklyAd } from "./chains/aldi.js";
import { scrapeJewelOscoWeeklyAd } from "./chains/jewelOsco.js";
import { scrapeKrogerWeeklyAd } from "./chains/kroger.js";
import { scrapeMarianosWeeklyAd } from "./chains/marianos.js";

type WeeklyAdScraper = (store: NearbyStore) => Promise<SaleItem[]>;

const SUPPORTED_CHAINS: readonly SupportedStoreChain[] = ["aldi", "jewel-osco", "kroger", "marianos"];

const SCRAPERS: Record<SupportedStoreChain, WeeklyAdScraper> = {
  aldi: scrapeAldiWeeklyAd,
  "jewel-osco": scrapeJewelOscoWeeklyAd,
  kroger: scrapeKrogerWeeklyAd,
  marianos: scrapeMarianosWeeklyAd,
};

export function validateWeeklyDealsRequest(body: unknown): WeeklyDealsRequest {
  if (!isRecord(body) || !Array.isArray(body.stores)) {
    throw new Error("Request body must include a stores array.");
  }

  if (body.stores.length === 0) {
    throw new Error("At least one store is required.");
  }

  if (body.stores.length > MAX_NEARBY_STORES) {
    throw new Error(`A maximum of ${MAX_NEARBY_STORES} stores can be requested.`);
  }

  const seen = new Set<string>();
  const stores = body.stores.map((store, index) => normalizeStoreInput(store, index));

  for (const store of stores) {
    const key = `${store.company}:${store.storeId}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate store requested for ${store.company} ${store.storeId}.`);
    }
    seen.add(key);
  }

  return { stores };
}

export async function getWeeklyDeals(request: WeeklyDealsRequest): Promise<WeeklyDealsResponse> {
  const requestedAt = new Date().toISOString();
  const results = await Promise.all(request.stores.map((store) => scrapeStoreWithRetry(store)));
  const dealCount = results.reduce((total, result) => {
    return result.status === "succeeded" ? total + result.dealCount : total;
  }, 0);

  return {
    requestedAt,
    results,
    dealCount,
  };
}

async function scrapeStoreWithRetry(store: WeeklyDealsStoreInput): Promise<WeeklyDealsStoreResult> {
  try {
    const deals = await runScraper(store);
    return {
      company: store.company,
      storeId: store.storeId,
      status: "succeeded",
      deals,
      dealCount: deals.length,
    };
  } catch (firstError) {
    try {
      const deals = await runScraper(store);
      return {
        company: store.company,
        storeId: store.storeId,
        status: "succeeded",
        deals,
        dealCount: deals.length,
      };
    } catch (secondError) {
      return {
        company: store.company,
        storeId: store.storeId,
        status: "failed",
        error: formatScraperError(secondError, firstError),
      };
    }
  }
}

async function runScraper(store: WeeklyDealsStoreInput): Promise<SaleItem[]> {
  const scraper = SCRAPERS[store.company];

  return scraper({
    id: store.storeId,
    chain: store.company,
    name: store.company,
    address: "",
  });
}

function normalizeStoreInput(store: unknown, index: number): WeeklyDealsStoreInput {
  if (!isRecord(store)) {
    throw new Error(`Store at index ${index} must be an object.`);
  }

  const company = String(store.company ?? "").trim();
  const storeId = String(store.storeId ?? "").trim();

  if (!isSupportedChain(company)) {
    throw new Error(`Store at index ${index} has unsupported company "${company}".`);
  }

  if (!storeId) {
    throw new Error(`Store at index ${index} is missing storeId.`);
  }

  return { company, storeId };
}

function isSupportedChain(value: string): value is SupportedStoreChain {
  return SUPPORTED_CHAINS.includes(value as SupportedStoreChain);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatScraperError(error: unknown, firstError: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown scraper error.";
  const firstMessage = firstError instanceof Error ? firstError.message : "";

  if (firstMessage && firstMessage !== message) {
    return `${message} First attempt failed with: ${firstMessage}`;
  }

  return message;
}
