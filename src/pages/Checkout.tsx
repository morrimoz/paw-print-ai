import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Checkout = () => {
  const [loading, setLoading] = useState(false);

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.info("Checkout requires Stripe integration.");
      setLoading(false);
    }, 500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">Checkout</h1>

        <div className="bg-card rounded-xl shadow-card p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">Order Summary</h2>
          <div className="flex justify-between text-sm text-muted-foreground border-b border-border pb-3 mb-3">
            <span>Canvas Print (16x20)</span>
            <span>$34.99</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground border-b border-border pb-3 mb-3">
            <span>Shipping</span>
            <span>$5.99</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>$40.98</span>
          </div>
        </div>

        <form onSubmit={handleOrder} className="bg-card rounded-xl shadow-card p-6 flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Shipping Details</h2>
          <input type="text" placeholder="Full Name" required className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" placeholder="Address" required className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="City" required className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="text" placeholder="ZIP Code" required className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <input type="text" placeholder="Country" required className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

          <Button type="submit" variant="hero" disabled={loading} className="w-full mt-2">
            {loading ? "Processing..." : "Complete Order"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Checkout;
