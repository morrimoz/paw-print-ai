import { useCurrency } from "@/hooks/useCurrency";
import { getMarkedUpPrice, formatConverted, getDisplayPrice } from "@/utils/pricing";

interface PriceDisplayProps {
  basePrice: string | number;
  prefix?: string;
  className?: string;
  /** When true, the localized line is hidden even if available. */
  usdOnly?: boolean;
}

/**
 * Shows the USD price plus, when the user isn't already on USD and a rate is available,
 * the equivalent in their local currency below it.
 */
export function PriceDisplay({ basePrice, prefix, className, usdOnly }: PriceDisplayProps) {
  const { code, rate, ready } = useCurrency();
  const usd = getMarkedUpPrice(basePrice);
  const showLocal = !usdOnly && ready && code !== "USD" && rate > 0;

  return (
    <span className={className}>
      <span>
        {prefix ? `${prefix} ` : ""}
        {getDisplayPrice(basePrice)}
      </span>
      {showLocal && (
        <span className="block text-xs font-normal text-muted-foreground mt-0.5">
          ≈ {formatConverted(usd, code, rate)}
        </span>
      )}
    </span>
  );
}
