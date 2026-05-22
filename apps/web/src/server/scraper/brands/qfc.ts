import type { ScrapeWeeklyAdResponse } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger";

const QFC_WEEKLY_AD_URL = "https://www.qfc.com/weeklyad";

export async function scrapeQfcWeeklyAd(storeId: string): Promise<ScrapeWeeklyAdResponse> {
  return scrapeKrogerFamilyWeeklyAd({
    brand: "qfc",
    displayName: "QFC",
    storeId,
    sourceUrl: QFC_WEEKLY_AD_URL,
  });
}
