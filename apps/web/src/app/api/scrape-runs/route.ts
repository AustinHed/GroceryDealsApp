import type { ScrapeWeeklyAdRequest } from "@grocery-deals/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: Partial<ScrapeWeeklyAdRequest>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (body.brand !== "kroger") {
    return Response.json({ error: 'Only brand "kroger" is supported by this POC.' }, { status: 400 });
  }

  const storeId = String(body.storeId ?? "").trim();
  if (!storeId) {
    return Response.json({ error: "storeId is required." }, { status: 400 });
  }

  try {
    if (process.env.KROGER_SCRAPER_ENDPOINT) {
      const upstream = await fetch(process.env.KROGER_SCRAPER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: "kroger", storeId }),
      });
      const payload = await upstream.json();

      if (!upstream.ok) {
        return Response.json(payload, { status: upstream.status });
      }

      return Response.json({ deals: payload.deals }, { status: upstream.status });
    }

    const { scrapeKrogerWeeklyAd } = await import("@/server/scraper/brands/kroger");
    const result = await scrapeKrogerWeeklyAd(storeId);
    return Response.json({ deals: result.deals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error.";
    return Response.json(
      {
        brand: "kroger",
        storeId,
        error: message,
      },
      { status: 500 },
    );
  }
}
