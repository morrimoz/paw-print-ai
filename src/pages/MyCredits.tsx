import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

const packages = [
  { name: "Starter Pack", credits: 10, price: 5 },
  { name: "Enthusiast Pack", credits: 50, price: 20, popular: true },
  { name: "Pro Pack", credits: 200, price: 60 },
];

const MyCredits = () => {
  const balance = 5;
  const transactions: any[] = [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">My Credits</h1>

        {/* Balance */}
        <div className="bg-accent rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-foreground">Current Balance</p>
            <p className="font-heading text-4xl font-extrabold text-foreground">{balance} credits</p>
          </div>
          <CreditCard className="h-10 w-10 text-primary" />
        </div>

        {/* Packages */}
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Purchase More Credits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`bg-card rounded-xl p-5 shadow-card flex flex-col ${pkg.popular ? "ring-2 ring-primary" : ""}`}
            >
              {pkg.popular && (
                <span className="text-xs font-semibold text-primary mb-2">Best Value</span>
              )}
              <h3 className="font-heading font-semibold text-foreground">{pkg.name}</h3>
              <p className="text-2xl font-extrabold text-foreground mt-1">${pkg.price}</p>
              <p className="text-xs text-muted-foreground">{pkg.credits} credits</p>
              <Button
                variant={pkg.popular ? "default" : "outline"}
                size="sm"
                className="mt-4"
                onClick={() => toast.info("Credit purchase requires Stripe integration.")}
              >
                Purchase <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default MyCredits;
