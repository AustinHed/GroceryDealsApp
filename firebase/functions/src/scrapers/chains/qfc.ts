import type { NearbyStore, WeeklyAdDealSummary } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const QFC_WEEKLY_AD_URL = "https://www.qfc.com/weeklyad";

export async function scrapeQfcWeeklyAd(store: NearbyStore): Promise<WeeklyAdDealSummary[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "qfc",
    displayName: "QFC",
    storeId: store.id,
    sourceUrl: QFC_WEEKLY_AD_URL,
  });

  return response.deals;
}
