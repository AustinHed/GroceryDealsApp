import type {
  GenerateRecipesRequest,
  MealPlanDeal,
  SaleItem,
  WeeklyAdDealSummary,
  WeeklyDealsStoreResult,
} from "@grocery-deals/shared";

export function normalizeWeeklyDealsForMealPlanning(request: GenerateRecipesRequest): MealPlanDeal[] {
  return request.weeklyDeals.results.flatMap((result) => normalizeStoreResult(result));
}

function normalizeStoreResult(result: WeeklyDealsStoreResult): MealPlanDeal[] {
  if (result.status !== "succeeded") {
    return [];
  }

  return result.deals
    .map((deal, index) => normalizeDeal(deal, result.company, result.storeId, index))
    .filter((deal): deal is MealPlanDeal => Boolean(deal));
}

function normalizeDeal(
  deal: SaleItem | WeeklyAdDealSummary,
  company: MealPlanDeal["company"],
  storeId: string,
  index: number,
): MealPlanDeal | null {
  if (isWeeklyAdDealSummary(deal)) {
    const productName = cleanProductName(deal.productName);

    if (!productName) {
      return null;
    }

    return {
      dealId: buildDealId(company, storeId, productName, index),
      company,
      storeId,
      productName,
      priceText: deal.salePriceText,
      salePrice: deal.salePrice,
      regularPriceText: deal.regularPriceText,
      regularPrice: deal.regularPrice,
      savingsAmount: deal.savingsAmount,
      savingsPercent: deal.savingsPercent,
      discountType: deal.discountType,
      promotionText: deal.promotionText,
      category: deal.category,
      requiresLoyalty: deal.requiresLoyalty,
      requiresDigitalCoupon: deal.requiresDigitalCoupon,
      source: "weekly_ad",
    };
  }

  const productName = cleanProductName(deal.name);

  if (!productName) {
    return null;
  }

  return {
    dealId: buildDealId(company, storeId, productName, index),
    company,
    storeId,
    productName,
    priceText: deal.price,
    discountType: "unknown",
    category: deal.category,
    source: "weekly_ad",
  };
}

function isWeeklyAdDealSummary(deal: SaleItem | WeeklyAdDealSummary): deal is WeeklyAdDealSummary {
  return "productName" in deal;
}

function buildDealId(company: string, storeId: string, productName: string, index: number): string {
  return `${company}:${storeId}:${index}:${slugify(productName)}`;
}

function cleanProductName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "deal";
}
