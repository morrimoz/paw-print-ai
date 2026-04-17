import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { FreeShippingBadge } from "@/components/FreeShippingBadge";
import { ArrowLeft } from "lucide-react";

interface OrderItem {
  variant_id: number;
  variant_name?: string;
  product_title?: string;
  product_image?: string;
  size?: string;
  color?: string;
  price: string | number; // display price like "$34.99" or numeric
  artwork_url: string;
}

interface CheckoutLocationState {
  orderItem?: OrderItem;
  treatPriceId?: string;
  treatPackName?: string;
}

function priceToCents(price: string | number): number {
  const n = Number(String(price ?? "0").replace(/[^0-9.]/g, ""));
  return Math.round(n * 100);
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = (location.state || {}) as CheckoutLocationState;
  const { orderItem, treatPriceId } = state;

  const returnUrl = `${window.location.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`;

  if (!user) {
    return (
      <DashboardLayout>
        <p className="text-center text-muted-foreground py-12">Please sign in to checkout.</p>
      </DashboardLayout>
    );
  }

  if (!orderItem && !treatPriceId) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <h1 className="font-heading text-2xl font-bold text-foreground">Nothing to checkout</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a product or treat pack to get started.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button asChild variant="outline"><Link to="/gallery">Browse products</Link></Button>
            <Button asChild><Link to="/my-treats">Buy treats</Link></Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PaymentTestModeBanner />
      <div className="max-w-3xl mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-3">Checkout</h1>
        <div className="mb-6">
          <FreeShippingBadge />
        </div>

        {orderItem && (
          <div className="bg-card rounded-xl shadow-card p-5 mb-6 flex gap-4 items-center">
            {orderItem.product_image && (
              <img src={orderItem.product_image} alt={orderItem.product_title} className="h-20 w-20 object-cover rounded-lg" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground">{orderItem.product_title}</p>
              <p className="text-sm text-muted-foreground">
                {[orderItem.size, orderItem.color].filter(Boolean).join(" · ")}
              </p>
            </div>
            <p className="font-bold text-foreground">{typeof orderItem.price === "number" ? `$${orderItem.price.toFixed(2)}` : orderItem.price}</p>
          </div>
        )}

        {treatPriceId && state.treatPackName && (
          <div className="bg-card rounded-xl shadow-card p-5 mb-6">
            <p className="font-semibold text-foreground">{state.treatPackName}</p>
            <p className="text-sm text-muted-foreground">One-time treat purchase</p>
          </div>
        )}

        <div className="bg-card rounded-xl shadow-card p-2">
          <StripeEmbeddedCheckout
            priceId={treatPriceId}
            merch={
              orderItem
                ? {
                    name: `${orderItem.product_title || "Custom Pet Product"}${orderItem.size || orderItem.color ? ` (${[orderItem.size, orderItem.color].filter(Boolean).join(", ")})` : ""}`,
                    amountCents: priceToCents(orderItem.price),
                    productImage: orderItem.product_image,
                    productTitle: orderItem.product_title,
                    variantId: orderItem.variant_id,
                    variantName: orderItem.variant_name,
                    size: orderItem.size,
                    color: orderItem.color,
                    artworkUrl: orderItem.artwork_url,
                  }
                : undefined
            }
            customerEmail={user.email}
            userId={user.id}
            returnUrl={returnUrl}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Checkout;
