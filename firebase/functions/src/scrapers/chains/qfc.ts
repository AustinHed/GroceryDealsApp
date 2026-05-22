import type { NearbyStore, SaleItem } from "@grocery-deals/shared";
import { scrapeKrogerFamilyWeeklyAd } from "./kroger.js";

const QFC_WEEKLY_AD_URL = "https://www.qfc.com/weeklyad";

export async function scrapeQfcWeeklyAd(store: NearbyStore): Promise<SaleItem[]> {
  const response = await scrapeKrogerFamilyWeeklyAd({
    brand: "qfc",
    displayName: "QFC",
    storeId: store.id,
    sourceUrl: QFC_WEEKLY_AD_URL,
  });

  return response.deals.map((deal, index) => ({
    id: `${store.id}-${index}`,
    storeId: store.id,
    name: deal.productName,
    price: deal.salePriceText ?? "",
    category: deal.category,
  }));
}
