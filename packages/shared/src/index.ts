export type AddressInput = {
  streetAddress: string;
  city?: string;
  region?: string;
  postalCode?: string;
};

export type SupportedStoreChain = "aldi" | "jewel-osco" | "kroger";

export type NearbyStore = {
  id: string;
  chain: SupportedStoreChain;
  name: string;
  address: string;
  distanceMiles?: number;
  weeklyAdUrl?: string;
};

export type SaleItem = {
  id: string;
  storeId: string;
  name: string;
  price: string;
  category?: string;
  validThrough?: string;
};

export type MealPlanRequest = {
  address: AddressInput;
  stores: NearbyStore[];
  saleItems: SaleItem[];
  days: number;
};

export type MealPlanDay = {
  day: string;
  meals: string[];
  highlightedSaleItems: string[];
};

export type MealPlanResponse = {
  overview: string;
  days: MealPlanDay[];
  shoppingNotes: string[];
};

export const MAX_NEARBY_STORES = 3;
