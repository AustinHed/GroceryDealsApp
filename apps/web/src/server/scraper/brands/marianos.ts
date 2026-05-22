import type { ScrapeWeeklyAdResponse } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger";

const MARIANOS_WEEKLY_AD_URL = "https://www.marianos.com/weeklyad";

export async function scrapeMarianosWeeklyAd(storeId: string): Promise<ScrapeWeeklyAdResponse> {
  return scrapeKrogerFamilyWeeklyAd({
    brand: "marianos",
    displayName: "Mariano's",
    storeId,
    sourceUrl: MARIANOS_WEEKLY_AD_URL,
  });
}
