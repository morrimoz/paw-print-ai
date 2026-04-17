import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreeShippingBadgeProps {
  variant?: "pill" | "banner" | "inline";
  className?: string;
}

/**
 * Reusable badge that promotes free worldwide shipping.
 * - pill: compact rounded chip (good for hero / above-the-fold)
 * - banner: full-width strip (good for top of pages or checkout)
 * - inline: small inline text+icon (good for product detail near price)
 */
export function FreeShippingBadge({ variant = "pill", className }: FreeShippingBadgeProps) {
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "w-full border-y border-primary/20 bg-primary/10 backdrop-blur",
          className,
        )}
      >
        <div className="container flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-foreground">
          <Truck className="h-4 w-4 text-primary" />
          <span>
            <span className="text-primary font-bold">Free worldwide shipping</span> on all orders
          </span>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Truck className="h-3.5 w-3.5 text-primary" />
        <span>
          <span className="text-primary font-semibold">Free worldwide shipping</span> · no hidden fees
        </span>
      </div>
    );
  }

  // pill (default) — outlined / ghost style to contrast with filled promo pills
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-dashed border-foreground/25 bg-background/40 px-4 py-2 backdrop-blur",
        className,
      )}
    >
      <Truck className="h-4 w-4 text-foreground/70" />
      <span className="text-sm font-medium text-foreground/90 tracking-wide">
        Free worldwide shipping
        <span className="mx-2 text-foreground/30">·</span>
        <span className="uppercase text-xs font-bold text-foreground/60">on all orders</span>
      </span>
    </div>
  );
}
