import type { NearbyStore, SaleItem } from "@grocery-deals/shared";

export async function getWeeklyDeals(stores: NearbyStore[]): Promise<SaleItem[]> {
  // Future implementation: dispatch to a chain-specific scraper for each supported store.
  void stores;

  return [];
}
