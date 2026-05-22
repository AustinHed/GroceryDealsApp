import { MAX_NEARBY_STORES, type AddressInput, type NearbyStore } from "@grocery-deals/shared";

export type FindNearbyStoresInput = {
  address: AddressInput;
  limit?: number;
};

export async function findNearbyStores(input: FindNearbyStoresInput): Promise<NearbyStore[]> {
  const limit = Math.min(input.limit ?? MAX_NEARBY_STORES, MAX_NEARBY_STORES);

  // Future implementation: geocode the address, search supported chains, and rank by distance.
  void input.address;
  void limit;

  return [];
}
