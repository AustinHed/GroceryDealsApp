import {
  MAX_NEARBY_STORES,
  type SupportedStoreChain,
  type WeeklyAdDealSummary,
  type WeeklyDealsRequest,
  type WeeklyDealsResponse,
  type WeeklyDealsStoreInput,
  type WeeklyDealsStoreResult,
} from "@grocery-deals/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_CHAINS: readonly SupportedStoreChain[] = ["kroger", "marianos", "fred-meyer", "qfc", "ralphs"];

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let weeklyDealsRequest: WeeklyDealsRequest;

  try {
    weeklyDealsRequest = validateWeeklyDealsRequest(body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid weekly deals request." },
      { status: 400 },
    );
  }

  try {
    if (process.env.WEEKLY_DEALS_COORDINATOR_ENDPOINT) {
      const upstream = await fetch(process.env.WEEKLY_DEALS_COORDINATOR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weeklyDealsRequest),
      });
      const payload = await upstream.json();

      return Response.json(payload, { status: upstream.status });
    }

    return Response.json(await getLocalWeeklyDeals(weeklyDealsRequest));
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Weekly deals coordinator failed.",
      },
      { status: 500 },
    );
  }
}

function validateWeeklyDealsRequest(body: unknown): WeeklyDealsRequest {
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

async function getLocalWeeklyDeals(request: WeeklyDealsRequest): Promise<WeeklyDealsResponse> {
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
    const deals = await runLocalScraper(store);
    return {
      company: store.company,
      storeId: store.storeId,
      status: "succeeded",
      deals,
      dealCount: deals.length,
    };
  } catch (firstError) {
    try {
      const deals = await runLocalScraper(store);
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

async function runLocalScraper(store: WeeklyDealsStoreInput): Promise<WeeklyAdDealSummary[]> {
  const response = await scrapeKrogerFamilyBrand(store);

  return response.deals;
}

async function scrapeKrogerFamilyBrand(store: WeeklyDealsStoreInput) {
  switch (store.company) {
    case "fred-meyer":
      return import("@/server/scraper/brands/fredMeyer").then(({ scrapeFredMeyerWeeklyAd }) =>
        scrapeFredMeyerWeeklyAd(store.storeId),
      );
    case "marianos":
      return import("@/server/scraper/brands/marianos").then(({ scrapeMarianosWeeklyAd }) =>
        scrapeMarianosWeeklyAd(store.storeId),
      );
    case "qfc":
      return import("@/server/scraper/brands/qfc").then(({ scrapeQfcWeeklyAd }) => scrapeQfcWeeklyAd(store.storeId));
    case "ralphs":
      return import("@/server/scraper/brands/ralphs").then(({ scrapeRalphsWeeklyAd }) =>
        scrapeRalphsWeeklyAd(store.storeId),
      );
    case "kroger":
      return import("@/server/scraper/brands/kroger").then(({ scrapeKrogerWeeklyAd }) =>
        scrapeKrogerWeeklyAd(store.storeId),
      );
    default:
      throw new Error(`Unsupported local scraper for ${store.company}.`);
  }
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
