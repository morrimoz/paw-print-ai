// 👉 To change product pricing, update this single multiplier.
// It is applied to every Printful base price across the entire app
// (gallery, product detail, checkout, order totals).
// Example: 2.0 = 100% markup, 2.5 = 150% markup, 3.0 = 200% markup.
const MARKUP_MULTIPLIER = 2;

/**
 * Apply markup to Printful base price
 * @param basePriceStr - Price string from Printful (e.g. "15.50")
 * @returns Formatted display price string (e.g. "$23.25")
 */
export function getDisplayPrice(basePriceStr: string | number): string {
  const basePrice = typeof basePriceStr === "string" ? parseFloat(basePriceStr) : basePriceStr;
  if (isNaN(basePrice)) return "$0.00";
  const marked = basePrice * MARKUP_MULTIPLIER;
  return `$${marked.toFixed(2)}`;
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
  if (!prices.length) return "$0.00";
  const min = Math.min(...prices.map((p) => (typeof p === "string" ? parseFloat(p) : p)).filter((p) => !isNaN(p)));
  return getDisplayPrice(min);
}
