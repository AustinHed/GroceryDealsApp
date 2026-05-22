import type { DiscountType } from "@grocery-deals/shared";

const MONEY_PATTERN = /\$[\d]+(?:[.,]\d{2})?/g;

export function parseMoney(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\$?\s*([\d]+(?:[.,]\d{2})?)/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function findMoneyValues(text: string): string[] {
  return Array.from(new Set(text.match(MONEY_PATTERN) ?? []));
}

export function inferDiscountType(text: string): DiscountType {
  const normalized = text.toLowerCase();

  if (/\bbogo\b|buy\s+one|get\s+one/.test(normalized)) {
    return "bogo";
  }

  if (/digital\s+coupon|e-coupon|clip/.test(normalized)) {
    return "digital_coupon";
  }

  if (/card|loyalty|with\s+card|member/.test(normalized)) {
    return "loyalty";
  }

  if (/\d+\s*%|percent/.test(normalized)) {
    return "percent_off";
  }

  if (/\d+\s+for\s+\$|\$\d+(?:\.\d{2})?\s*(?:\/|each\s+when\s+you\s+buy)|when\s+you\s+buy/.test(normalized)) {
    return "multi_buy";
  }

  if (/save\s+\$|\$\d+(?:\.\d{2})?\s+off|off\s+\$/.test(normalized)) {
    return "amount_off";
  }

  if (MONEY_PATTERN.test(text)) {
    return "sale_price";
  }

  return "unknown";
}

export function inferSalePriceText(text: string): string | undefined {
  const values = findMoneyValues(text);
  return values[0];
}

export function inferRegularPriceText(text: string): string | undefined {
  const regularMatch = text.match(/(?:reg(?:ular)?\.?|was|original(?:ly)?)\s*:?\s*(\$[\d]+(?:[.,]\d{2})?)/i);
  return regularMatch?.[1];
}

export function inferSavings(text: string): {
  savingsAmount?: number;
  savingsPercent?: number;
} {
  const amountMatch = text.match(/save\s+\$([\d]+(?:[.,]\d{2})?)/i);
  const percentMatch = text.match(/(\d+)\s*%/);

  return {
    savingsAmount: amountMatch ? parseMoney(amountMatch[1]) : undefined,
    savingsPercent: percentMatch ? Number.parseInt(percentMatch[1], 10) : undefined,
  };
}
