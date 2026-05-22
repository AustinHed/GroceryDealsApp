import type { NearbyStore, SaleItem } from "@grocery-deals/shared";
import { scrapeKrogerWeeklyAdByStoreId } from "./kroger.js";

export async function scrapeMarianosWeeklyAd(store: NearbyStore): Promise<SaleItem[]> {
  const response = await scrapeKrogerWeeklyAdByStoreId(store.id);

  return response.deals.map((deal, index) => ({
    id: `${store.id}-${index}`,
    storeId: store.id,
    name: deal.productName,
    price: deal.salePriceText ?? "",
    category: deal.category,
  }));
}
