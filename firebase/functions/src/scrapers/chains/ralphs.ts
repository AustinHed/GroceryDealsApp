import type { NearbyStore, SaleItem } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const RALPHS_WEEKLY_AD_URL = "https://www.ralphs.com/weeklyad";

export async function scrapeRalphsWeeklyAd(store: NearbyStore): Promise<SaleItem[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "ralphs",
    displayName: "Ralphs",
    storeId: store.id,
    sourceUrl: RALPHS_WEEKLY_AD_URL,
  });

  return response.deals.map((deal, index) => ({
    id: `${store.id}-${index}`,
    storeId: store.id,
    name: deal.productName,
    price: deal.salePriceText ?? "",
    category: deal.category,
  }));
}
