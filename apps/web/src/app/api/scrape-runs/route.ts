import type { GroceryBrand, ScrapeWeeklyAdRequest } from "@grocery-deals/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: Partial<ScrapeWeeklyAdRequest>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isSupportedBrand(body.brand)) {
    return Response.json(
      { error: 'Only Kroger-family brands "kroger", "marianos", "fred-meyer", "qfc", and "ralphs" are supported by this POC.' },
      { status: 400 },
    );
  }

  const brand = body.brand;
  const storeId = String(body.storeId ?? "").trim();
  if (!storeId) {
    return Response.json({ error: "storeId is required." }, { status: 400 });
  }

  try {
    if (brand === "kroger" && process.env.KROGER_SCRAPER_ENDPOINT) {
      const upstream = await fetch(process.env.KROGER_SCRAPER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, storeId }),
      });
      const payload = await upstream.json();

      if (!upstream.ok) {
        return Response.json(payload, { status: upstream.status });
      }

      return Response.json({ deals: payload.deals }, { status: upstream.status });
    }

    const result = await runLocalScraper(brand, storeId);
    return Response.json({ deals: result.deals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error.";
    return Response.json(
      {
        brand,
        storeId,
        error: message,
      },
      { status: 500 },
    );
  }
}

async function runLocalScraper(brand: GroceryBrand, storeId: string) {
  switch (brand) {
    case "fred-meyer": {
      const { scrapeFredMeyerWeeklyAd } = await import("@/server/scraper/brands/fredMeyer");
      return scrapeFredMeyerWeeklyAd(storeId);
    }
    case "marianos": {
      const { scrapeMarianosWeeklyAd } = await import("@/server/scraper/brands/marianos");
      return scrapeMarianosWeeklyAd(storeId);
    }
    case "qfc": {
      const { scrapeQfcWeeklyAd } = await import("@/server/scraper/brands/qfc");
      return scrapeQfcWeeklyAd(storeId);
    }
    case "ralphs": {
      const { scrapeRalphsWeeklyAd } = await import("@/server/scraper/brands/ralphs");
      return scrapeRalphsWeeklyAd(storeId);
    }
    case "kroger": {
      const { scrapeKrogerWeeklyAd } = await import("@/server/scraper/brands/kroger");
      return scrapeKrogerWeeklyAd(storeId);
    }
    default:
      throw new Error(`Unsupported local scraper for ${brand}.`);
  }
}

function isSupportedBrand(brand: unknown): brand is GroceryBrand {
  return brand === "kroger" || brand === "marianos" || brand === "fred-meyer" || brand === "qfc" || brand === "ralphs";
}
