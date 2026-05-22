import { randomUUID } from "node:crypto";
import type { DiscountType, ScrapeWeeklyAdResponse, WeeklyAdDeal, WeeklyAdDealSummary } from "@grocery-deals/shared";

type KrogerStoreContext = {
  locationId: string;
  divisionId: string;
  storeCode: string;
};

type KrogerCircular = {
  id: string;
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  circularType?: string;
  tags?: string[];
  previewCircular?: boolean;
};

type KrogerCircularsResponse = {
  data?: KrogerCircular[];
};

type KrogerImage = {
  url?: string;
};

type KrogerDepartment = {
  department?: string;
  name?: string;
};

type KrogerOfferSummary = {
  hasCoupons?: boolean;
};

type KrogerAd = {
  id?: string;
  mainlineCopy?: string;
  headline?: string;
  description?: string;
  underlineCopy?: string;
  miscellaneousText?: string;
  salePrice?: number | string;
  retailPrice?: number | string;
  saveAmount?: number | string;
  savePercent?: number | string | null;
  percentOff?: number | string | null;
  pricingTemplate?: string;
  loyaltyIndicator?: string;
  uom?: string;
  images?: KrogerImage[];
  departments?: KrogerDepartment[];
  adGroups?: string[];
  stores?: Array<string | { storeId?: string }>;
  offers?: KrogerOfferSummary;
};

type KrogerAdGroup = {
  id?: string;
  ids?: string[];
  name?: string;
  shortDisplayName?: string;
  type?: string;
};

type KrogerDealsResponse = {
  data?: {
    ads?: KrogerAd[];
    adGroups?: KrogerAdGroup[];
  };
};

const KROGER_WEEKLY_AD_URL = "https://www.kroger.com/weeklyad";
const KROGER_DIGITAL_ADS_API = "https://api.kroger.com/digitalads/v1";

export async function scrapeKrogerWeeklyAd(storeId: string): Promise<ScrapeWeeklyAdResponse> {
  const scrapedAt = new Date().toISOString();
  const store = parseKrogerStoreId(storeId);
  const headers = krogerApiHeaders(store.locationId);
  const circularsUrl = buildCircularsUrl(store.divisionId);
  const circulars = await fetchKrogerJson<KrogerCircularsResponse>(circularsUrl, headers);
  const circular = selectWeeklyAdCircular(circulars.data ?? []);

  if (!circular) {
    throw new Error(`No shoppable Kroger weekly ad circular was found for division ${store.divisionId}.`);
  }

  const dealsUrl = buildDealsUrl(store, circular.id);
  const dealsResponse = await fetchKrogerJson<KrogerDealsResponse>(dealsUrl, headers);
  const adGroups = buildAdGroupLookup(dealsResponse.data?.adGroups ?? []);
  const normalizedDeals = normalizeDeals(dealsResponse.data?.ads ?? [], adGroups, {
    store,
    scrapedAt,
  });
  const deals = normalizedDeals.map(toWeeklyAdDealSummary);

  return {
    brand: "kroger",
    storeId: store.locationId,
    scrapedAt,
    sourceUrl: KROGER_WEEKLY_AD_URL,
    dealCount: deals.length,
    deals,
    diagnostics: {
      extractionMethod: "kroger-digitalads-api",
      divisionId: store.divisionId,
      storeCode: store.storeCode,
      circularId: circular.id,
      circularName: circular.eventName,
      apiUrls: [circularsUrl, dealsUrl],
      message: deals.length
        ? undefined
        : `Kroger returned the circular but no ads for division ${store.divisionId}, store ${store.storeCode}.`,
    },
  };
}

function parseKrogerStoreId(storeId: string): KrogerStoreContext {
  const locationId = storeId.trim();

  if (!/^\d{8}$/.test(locationId)) {
    throw new Error("Kroger storeId must be the 8-digit locationId, for example 01400413.");
  }

  return {
    locationId,
    divisionId: locationId.slice(0, 3),
    storeCode: locationId.slice(3),
  };
}

function krogerApiHeaders(locationId: string): HeadersInit {
  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    origin: "https://www.kroger.com",
    referer: KROGER_WEEKLY_AD_URL,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "x-call-origin": JSON.stringify({ page: "/weeklyad", component: "weekly ad" }),
    "x-facility-id": locationId,
    "x-kroger-channel": "WEB",
    "x-modality": JSON.stringify({ type: "PICKUP", locationId }),
    "x-modality-type": "PICKUP",
  };
}

function buildCircularsUrl(divisionId: string): string {
  const params = new URLSearchParams();
  params.append("filter.div", divisionId);
  params.append("filter.tags", "SHOPPABLE");
  params.append("filter.tags", "CLASSIC_VIEW");

  return `${KROGER_DIGITAL_ADS_API}/circulars?${params.toString()}`;
}

function buildDealsUrl(store: KrogerStoreContext, circularId: string): string {
  const params = new URLSearchParams({
    "filter.div": store.divisionId,
    "filter.store": store.storeCode,
    "filter.circularId": circularId,
  });

  return `${KROGER_DIGITAL_ADS_API}/deals?${params.toString()}`;
}

async function fetchKrogerJson<T>(url: string, headers: HeadersInit): Promise<T> {
  const response = await fetch(url, { headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Kroger API request failed (${response.status}) for ${url}: ${text.slice(0, 500)}`);
  }

  return JSON.parse(text) as T;
}

function selectWeeklyAdCircular(circulars: KrogerCircular[]): KrogerCircular | undefined {
  return circulars
    .filter((circular) => circular.id && circular.previewCircular !== true)
    .filter((circular) => circular.tags?.includes("SHOPPABLE") ?? true)
    .sort((a, b) => scoreCircular(b) - scoreCircular(a))[0];
}

function scoreCircular(circular: KrogerCircular): number {
  let score = 0;

  if (circular.circularType === "weeklyAd") score += 100;
  if (/weekly\s+ad/i.test(circular.eventName ?? "")) score += 50;
  if (circular.tags?.includes("SHOPPABLE")) score += 10;

  const start = circular.eventStartDate ? Date.parse(circular.eventStartDate) : 0;
  if (Number.isFinite(start)) score += start / 1_000_000_000_000;

  return score;
}

function normalizeDeals(
  ads: KrogerAd[],
  adGroups: Map<string, KrogerAdGroup>,
  context: { store: KrogerStoreContext; scrapedAt: string },
): WeeklyAdDeal[] {
  const seen = new Set<string>();

  return ads
    .filter((ad) => isAdAvailableAtStore(ad, context.store))
    .map((ad) => {
      const groups = (ad.adGroups ?? []).map((id) => adGroups.get(id)).filter(Boolean) as KrogerAdGroup[];
      const rawText = buildRawText(ad, groups);
      const salePrice = toNumber(ad.salePrice);
      const regularPrice = toNumber(ad.retailPrice);
      const savingsAmount = toNumber(ad.saveAmount);
      const savingsPercent = toNumber(ad.savePercent ?? ad.percentOff);
      const requiresDigitalCoupon = Boolean(ad.offers?.hasCoupons || groups.some(isDigitalCouponGroup));
      const requiresLoyalty = Boolean(/card|loyalty|member/i.test(ad.loyaltyIndicator ?? "") || requiresDigitalCoupon);

      return {
        id: ad.id ?? randomUUID(),
        brand: "kroger" as const,
        storeId: context.store.locationId,
        productName: cleanProductName(ad.mainlineCopy ?? ad.headline ?? ad.description ?? "Kroger weekly ad deal"),
        salePriceText: formatSalePriceText(ad, salePrice, savingsAmount, savingsPercent),
        salePrice,
        regularPriceText: formatMoneyText(regularPrice),
        regularPrice,
        savingsAmount,
        savingsPercent,
        discountType: inferKrogerDiscountType(ad, groups, requiresDigitalCoupon),
        rawText,
        imageUrl: ad.images?.find((image) => image.url)?.url,
        category: ad.departments?.[0]?.department ?? ad.departments?.[0]?.name ?? groups[0]?.shortDisplayName ?? groups[0]?.name,
        requiresLoyalty,
        requiresDigitalCoupon,
        sourceUrl: KROGER_WEEKLY_AD_URL,
        scrapedAt: context.scrapedAt,
      };
    })
    .filter((deal) => deal.productName && deal.rawText)
    .filter((deal) => {
      const key = `${deal.id}|${deal.productName}|${deal.salePriceText ?? ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function inferKrogerDiscountType(ad: KrogerAd, groups: KrogerAdGroup[], requiresDigitalCoupon: boolean): DiscountType {
  const text = [ad.pricingTemplate, ad.mainlineCopy, ad.underlineCopy, ad.miscellaneousText, ...groups.map((group) => group.name)]
    .filter(Boolean)
    .join(" ");

  if (/bogo|buy\s+one|get\s+one/i.test(text)) return "bogo";
  if (requiresDigitalCoupon) return "digital_coupon";
  if (toNumber(ad.savePercent ?? ad.percentOff) !== undefined || /percent|%\s*off/i.test(text)) return "percent_off";
  if (toNumber(ad.saveAmount) !== undefined || /amount\s*off|save\s+\$/i.test(text)) return "amount_off";
  if (/multi|2\s*for|3\s*for|\d+\s*\/\s*\$/i.test(text)) return "multi_buy";
  if (toNumber(ad.salePrice) !== undefined) return "sale_price";
  if (/card|loyalty|member/i.test(ad.loyaltyIndicator ?? "")) return "loyalty";

  return "unknown";
}

function formatSalePriceText(ad: KrogerAd, salePrice?: number, savingsAmount?: number, savingsPercent?: number): string | undefined {
  const pricingTemplate = ad.pricingTemplate ?? "";

  if (/bogo/i.test(pricingTemplate)) return "BOGO";
  if (salePrice !== undefined) return `${formatMoneyText(salePrice)}${ad.uom ? `/${ad.uom}` : ""}`;
  if (savingsAmount !== undefined) return `Save ${formatMoneyText(savingsAmount)}`;
  if (savingsPercent !== undefined) return `${savingsPercent}% off`;

  return undefined;
}

function formatMoneyText(value?: number): string | undefined {
  if (value === undefined) return undefined;

  return `$${value.toFixed(2).replace(/\.00$/, "")}`;
}

function buildRawText(ad: KrogerAd, groups: KrogerAdGroup[]): string {
  return [
    ad.mainlineCopy,
    ad.headline,
    ad.description,
    ad.underlineCopy,
    ad.miscellaneousText,
    toNumber(ad.salePrice) !== undefined ? `Sale ${ad.salePrice}` : undefined,
    toNumber(ad.retailPrice) !== undefined ? `Regular ${ad.retailPrice}` : undefined,
    toNumber(ad.saveAmount) !== undefined ? `Save ${ad.saveAmount}` : undefined,
    toNumber(ad.savePercent) !== undefined ? `${ad.savePercent}% off` : undefined,
    ad.loyaltyIndicator,
    ad.pricingTemplate,
    ...groups.flatMap((group) => [group.shortDisplayName, group.name, group.type]),
  ]
    .filter(Boolean)
    .join(" | ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanProductName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const parsed = Number.parseFloat(value.replace(/[$,%]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildAdGroupLookup(groups: KrogerAdGroup[]): Map<string, KrogerAdGroup> {
  const lookup = new Map<string, KrogerAdGroup>();

  for (const group of groups) {
    for (const id of group.ids ?? []) {
      lookup.set(id, group);
    }

    if (group.id) {
      lookup.set(group.id, group);
    }
  }

  return lookup;
}

function isAdAvailableAtStore(ad: KrogerAd, store: KrogerStoreContext): boolean {
  if (!ad.stores?.length) return true;

  return ad.stores.some((entry) => {
    const storeId = typeof entry === "string" ? entry : entry.storeId;
    return storeId === store.storeCode || storeId === store.locationId;
  });
}

function isDigitalCouponGroup(group: KrogerAdGroup): boolean {
  return /digital|coupon|wdd/i.test([group.name, group.shortDisplayName, group.type].filter(Boolean).join(" "));
}

function toWeeklyAdDealSummary(deal: WeeklyAdDeal): WeeklyAdDealSummary {
  return {
    productName: deal.productName,
    salePrice: deal.salePrice,
    salePriceText: deal.salePriceText,
    regularPrice: deal.regularPrice,
    regularPriceText: deal.regularPriceText,
    savingsAmount: deal.savingsAmount,
    discountType: deal.discountType,
    category: deal.category,
    requiresLoyalty: deal.requiresLoyalty,
    requiresDigitalCoupon: deal.requiresDigitalCoupon,
  };
}
