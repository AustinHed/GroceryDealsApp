import type { ScrapeWeeklyAdResponse } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger";

const FRED_MEYER_WEEKLY_AD_URL = "https://www.fredmeyer.com/weeklyad";

export async function scrapeFredMeyerWeeklyAd(storeId: string): Promise<ScrapeWeeklyAdResponse> {
  return scrapeKrogerFamilyWeeklyAd({
    brand: "fred-meyer",
    displayName: "Fred Meyer",
    storeId,
    sourceUrl: FRED_MEYER_WEEKLY_AD_URL,
  });
}
