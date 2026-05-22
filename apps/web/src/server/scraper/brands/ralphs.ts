import type { ScrapeWeeklyAdResponse } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger";

const RALPHS_WEEKLY_AD_URL = "https://www.ralphs.com/weeklyad";

export async function scrapeRalphsWeeklyAd(storeId: string): Promise<ScrapeWeeklyAdResponse> {
  return scrapeKrogerFamilyWeeklyAd({
    brand: "ralphs",
    displayName: "Ralphs",
    storeId,
    sourceUrl: RALPHS_WEEKLY_AD_URL,
  });
}
