import type { NearbyStore, WeeklyAdDealSummary } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const RALPHS_WEEKLY_AD_URL = "https://www.ralphs.com/weeklyad";

export async function scrapeRalphsWeeklyAd(store: NearbyStore): Promise<WeeklyAdDealSummary[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "ralphs",
    displayName: "Ralphs",
    storeId: store.id,
    sourceUrl: RALPHS_WEEKLY_AD_URL,
  });

  return response.deals;
}
