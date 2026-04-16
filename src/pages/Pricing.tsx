import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Info } from "lucide-react";

const packages = [
  { name: "Starter Pack", treats: 10, price: 5, perTreat: "0.50", popular: false },
  { name: "Enthusiast Pack", treats: 50, price: 20, perTreat: "0.40", popular: true },
  { name: "Pro Pack", treats: 200, price: 60, perTreat: "0.30", popular: false },
];

const features = [
  "High-resolution AI art downloads",
  "All art styles included",
  "Merchandise ordering access",
  "Treats never expire",
  "Priority generation queue",
];

const Pricing = () => {
  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            Simple, Treat-Based Pricing
          </h1>
          <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg mx-auto">
            Buy treats, create art. No subscriptions, no hidden fees. Each generation costs 1 treat.
          </p>

          {/* Merch pricing callout */}
          <div className="mt-8 max-w-2xl mx-auto glass-card rounded-xl p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground text-left">
              <span className="font-semibold text-foreground">Merchandise pricing is separate.</span>{" "}
              Treats only cover AI art generation. Physical products (mugs, canvases, tees, etc.)
              are priced per-item based on the product you choose at checkout.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative bg-card rounded-xl p-6 shadow-card flex flex-col ${
                  pkg.popular ? "ring-2 ring-primary" : ""
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-heading text-xl font-semibold text-foreground">{pkg.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-foreground">${pkg.price}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pkg.treats} treats · ${pkg.perTreat} each
                </p>
                <ul className="mt-6 flex flex-col gap-2 flex-1">
                  {features.slice(0, pkg.popular ? 5 : 3).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={pkg.popular ? "hero" : "outline"}
                  className="mt-6 w-full"
                  asChild
                >
                  <Link to="/signup">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            🎉 New users get <strong>5 free treats</strong> on signup. No credit card required.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Pricing;
