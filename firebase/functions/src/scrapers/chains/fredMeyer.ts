import type { NearbyStore, WeeklyAdDealSummary } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const FRED_MEYER_WEEKLY_AD_URL = "https://www.fredmeyer.com/weeklyad";

export async function scrapeFredMeyerWeeklyAd(store: NearbyStore): Promise<WeeklyAdDealSummary[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "fred-meyer",
    displayName: "Fred Meyer",
    storeId: store.id,
    sourceUrl: FRED_MEYER_WEEKLY_AD_URL,
  });

  return response.deals;
}
