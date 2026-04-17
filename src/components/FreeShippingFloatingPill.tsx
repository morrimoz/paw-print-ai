import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "free-shipping-pill-dismissed";

/**
 * Fixed, dismissible "Free worldwide shipping" pill.
 * - Sits in the top-right of the viewport and follows scroll.
 * - Sunset-orange callout, distinct from the inline Bonus banner.
 * - Once dismissed (X), it stays hidden for the session.
 * - Only shows on the routes specified in `routes`.
 */
const ROUTES = ["/", "/gallery", "/checkout"];

export function FreeShippingFloatingPill() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    setVisible(!dismissed);
  }, []);

  const onProductPage = location.pathname.startsWith("/product/");
  const onAllowedRoute = ROUTES.includes(location.pathname) || onProductPage;

  if (!mounted || !visible || !onAllowedRoute) return null;

  return (
    <div
      className={cn(
        // Mobile: bottom-right. Desktop (md+): top-right.
        "fixed right-4 z-50 max-w-[calc(100vw-2rem)]",
        "bottom-4 md:bottom-auto md:top-20",
        "animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-top-4 duration-500",
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2 rounded-full pl-4 pr-2 py-2 shadow-lg ring-1 ring-black/10 text-white"
        style={{
          background:
            "linear-gradient(135deg, hsl(18 95% 58%), hsl(8 88% 52%))",
        }}
      >
        <Truck className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold whitespace-nowrap">
          Free worldwide shipping
          <span className="hidden sm:inline font-normal opacity-90">
            {" "}· on all orders
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
          aria-label="Dismiss free shipping notice"
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
