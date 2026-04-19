// 👉 To change product pricing, update this single multiplier.
// It is applied to every Printful base price across the entire app
// (gallery, product detail, checkout, order totals).
// Example: 2.0 = 100% markup, 2.5 = 150% markup, 3.0 = 200% markup.
const MARKUP_MULTIPLIER = 2;

/**
 * Apply markup to Printful base price (USD)
 */
export function getDisplayPrice(basePriceStr: string | number): string {
  const basePrice = typeof basePriceStr === "string" ? parseFloat(basePriceStr) : basePriceStr;
  if (isNaN(basePrice)) return "$0.00 USD";
  const marked = basePrice * MARKUP_MULTIPLIER;
  return `$${marked.toFixed(2)} USD`;
}

/**
 * Get raw numeric marked up price
 */
export function getMarkedUpPrice(basePriceStr: string | number): number {
  const basePrice = typeof basePriceStr === "string" ? parseFloat(basePriceStr) : basePriceStr;
  if (isNaN(basePrice)) return 0;
  return Math.round(basePrice * MARKUP_MULTIPLIER * 100) / 100;
}

/**
 * Get the starting price for a list of variant prices
 */
export function getStartingPrice(prices: (string | number)[]): string {
  if (!prices.length) return "$0.00 USD";
  const min = Math.min(...prices.map((p) => (typeof p === "string" ? parseFloat(p) : p)).filter((p) => !isNaN(p)));
  return getDisplayPrice(min);
}

// =================== Currency conversion ===================

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // 1 USD = rate * targetCurrency
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", JPY: "¥",
  INR: "₹", BRL: "R$", MXN: "MX$", CHF: "CHF", SEK: "kr", NOK: "kr",
  DKK: "kr", PLN: "zł", ZAR: "R", NZD: "NZ$", SGD: "S$", HKD: "HK$",
  KRW: "₩", CNY: "¥", TRY: "₺", AED: "د.إ",
};

/** Cheap locale → currency map for fallback when Intl info isn't enough. */
const LOCALE_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  NL: "EUR", BE: "EUR", PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", IN: "INR", BR: "BRL", MX: "MXN",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", ZA: "ZAR", SG: "SGD",
  HK: "HKD", KR: "KRW", CN: "CNY", TR: "TRY", AE: "AED",
};

export function detectUserCurrency(): string {
  try {
    const region = (Intl.DateTimeFormat().resolvedOptions() as { locale: string }).locale.split("-")[1]?.toUpperCase();
    if (region && LOCALE_CURRENCY[region]) return LOCALE_CURRENCY[region];
  } catch {/* ignore */}
  return "USD";
}

/** Format a USD amount in a target currency (using a USD->target rate). */
export function formatConverted(usdAmount: number, code: string, rate: number): string {
  const converted = usdAmount * rate;
  const symbol = CURRENCY_SYMBOLS[code] || "";
  // For currencies where decimals are uncommon, drop the cents.
  const noDecimals = ["JPY", "KRW"].includes(code);
  const formatted = noDecimals ? Math.round(converted).toLocaleString() : converted.toFixed(2);
  return `${symbol}${formatted} ${code}`;
}
