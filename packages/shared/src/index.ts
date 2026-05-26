export type AddressInput = {
  streetAddress: string;
  city?: string;
  region?: string;
  postalCode?: string;
};

export type SupportedStoreChain = "aldi" | "jewel-osco" | "kroger" | "marianos" | "fred-meyer" | "qfc" | "ralphs";

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

export type GroceryBrand = SupportedStoreChain;

export type DiscountType =
  | "sale_price"
  | "amount_off"
  | "percent_off"
  | "bogo"
  | "multi_buy"
  | "loyalty"
  | "digital_coupon"
  | "unknown";

export type ScrapeRunStatus = "queued" | "running" | "succeeded" | "failed";

export type ScrapeRun = {
  id: string;
  brand: GroceryBrand;
  storeId: string;
  status: ScrapeRunStatus;
  requestedByUserId?: string;
  startedAt?: string;
  finishedAt?: string;
  dealCount?: number;
  errorMessage?: string;
};

export type WeeklyAdDeal = {
  id: string;
  brand: GroceryBrand;
  storeId: string;
  scrapeRunId?: string;
  productName: string;
  salePriceText?: string;
  salePrice?: number;
  regularPriceText?: string;
  regularPrice?: number;
  savingsAmount?: number;
  savingsPercent?: number;
  discountType: DiscountType;
  rawText: string;
  imageUrl?: string;
  category?: string;
  requiresLoyalty?: boolean;
  requiresDigitalCoupon?: boolean;
  sourceUrl?: string;
  scrapedAt: string;
};

export type WeeklyAdDealSummary = Pick<
  WeeklyAdDeal,
  | "productName"
  | "salePrice"
  | "salePriceText"
  | "regularPrice"
  | "regularPriceText"
  | "savingsAmount"
  | "discountType"
  | "category"
  | "requiresLoyalty"
  | "requiresDigitalCoupon"
>;

export type ScrapeWeeklyAdRequest = {
  brand: GroceryBrand;
  storeId: string;
};

export type ScrapeWeeklyAdResponse = {
  brand: GroceryBrand;
  storeId: string;
  scrapedAt: string;
  sourceUrl: string;
  dealCount: number;
  deals: WeeklyAdDealSummary[];
  diagnostics?: {
    extractionMethod: string;
    message?: string;
    divisionId?: string;
    storeCode?: string;
    circularId?: string;
    circularName?: string;
    apiUrls?: string[];
  };
};

export type WeeklyDealsStoreInput = {
  company: SupportedStoreChain;
  storeId: string;
};

export type WeeklyDealsRequest = {
  stores: WeeklyDealsStoreInput[];
};

export type WeeklyDealsStoreSuccess = {
  company: SupportedStoreChain;
  storeId: string;
  status: "succeeded";
  deals: Array<SaleItem | WeeklyAdDealSummary>;
  dealCount: number;
};

export type WeeklyDealsStoreFailure = {
  company: SupportedStoreChain;
  storeId: string;
  status: "failed";
  error: string;
};

export type WeeklyDealsStoreResult = WeeklyDealsStoreSuccess | WeeklyDealsStoreFailure;

export type WeeklyDealsResponse = {
  requestedAt: string;
  results: WeeklyDealsStoreResult[];
  dealCount: number;
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

export type MealType = "lunch" | "dinner";

export type MealPlanDeal = {
  dealId: string;
  company: SupportedStoreChain;
  storeId: string;
  productName: string;
  priceText?: string;
  salePrice?: number;
  regularPriceText?: string;
  regularPrice?: number;
  savingsAmount?: number;
  discountType: DiscountType;
  category?: string;
  requiresLoyalty?: boolean;
  requiresDigitalCoupon?: boolean;
  source: "weekly_ad";
};

export type GenerateRecipesSettings = {
  lunchCount: number;
  dinnerCount: number;
  servings: 2;
  allowPantryStaples: boolean;
};

export type GenerateRecipesRequest = {
  stores: WeeklyDealsStoreInput[];
  weeklyDeals: WeeklyDealsResponse;
  settings: GenerateRecipesSettings;
};

export type GeneratedRecipeIngredient = {
  name: string;
  quantity: string | null;
  dealId: string | null;
  company: SupportedStoreChain | null;
  storeId: string | null;
  isPantryStaple: boolean;
};

export type GeneratedRecipe = {
  id: string;
  mealType: MealType;
  title: string;
  summary: string;
  ingredients: GeneratedRecipeIngredient[];
  instructions: string[];
  expectedSavings: string;
  dealIdsUsed: string[];
};

export type GenerateRecipesResponse = {
  generatedAt: string;
  recipes: GeneratedRecipe[];
  dealIndex: Record<string, MealPlanDeal>;
};

export const MAX_NEARBY_STORES = 3;
export const MIN_RECIPES_PER_MEAL_TYPE = 1;
export const DEFAULT_RECIPES_PER_MEAL_TYPE = 7;
export const MAX_RECIPES_PER_MEAL_TYPE = 14;
export const RECIPE_SERVINGS = 2;
