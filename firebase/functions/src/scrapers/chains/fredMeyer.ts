import type { NearbyStore, SaleItem } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const FRED_MEYER_WEEKLY_AD_URL = "https://www.fredmeyer.com/weeklyad";

export async function scrapeFredMeyerWeeklyAd(store: NearbyStore): Promise<SaleItem[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "fred-meyer",
    displayName: "Fred Meyer",
    storeId: store.id,
    sourceUrl: FRED_MEYER_WEEKLY_AD_URL,
  });

  return response.deals.map((deal, index) => ({
    id: `${store.id}-${index}`,
    storeId: store.id,
    name: deal.productName,
    price: deal.salePriceText ?? "",
    category: deal.category,
  }));
}
