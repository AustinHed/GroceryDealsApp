import type { NearbyStore, WeeklyAdDealSummary } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const MARIANOS_WEEKLY_AD_URL = "https://www.marianos.com/weeklyad";

export async function scrapeMarianosWeeklyAd(store: NearbyStore): Promise<WeeklyAdDealSummary[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "marianos",
    displayName: "Mariano's",
    storeId: store.id,
    sourceUrl: MARIANOS_WEEKLY_AD_URL,
  });

  return response.deals;
}
