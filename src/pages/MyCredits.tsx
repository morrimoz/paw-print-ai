import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MyCredits = () => {
  const { user, profile } = useAuth();

  const { data: packages = [] } = useQuery({
    queryKey: ["credit-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_packages").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">My Credits</h1>

        <div className="bg-accent rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-foreground">Current Balance</p>
            <p className="font-heading text-4xl font-extrabold text-foreground">{profile?.credits_balance ?? 0} credits</p>
          </div>
          <CreditCard className="h-10 w-10 text-primary" />
        </div>

        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Purchase More Credits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg: any) => (
            <div
              key={pkg.id}
              className={`bg-card rounded-xl p-5 shadow-card flex flex-col ${
                pkg.name === "Enthusiast Pack" ? "ring-2 ring-primary" : ""
              }`}
            >
              {pkg.name === "Enthusiast Pack" && (
                <span className="text-xs font-semibold text-primary mb-2">Best Value</span>
              )}
              <h3 className="font-heading font-semibold text-foreground">{pkg.name}</h3>
              <p className="text-2xl font-extrabold text-foreground mt-1">${Number(pkg.price).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{pkg.credits_amount} credits</p>
              <Button
                variant={pkg.name === "Enthusiast Pack" ? "default" : "outline"}
                size="sm"
                className="mt-4"
                onClick={() => toast.info("Credit purchase requires Stripe integration. Enable Stripe to proceed.")}
              >
                Purchase <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="bg-card rounded-lg p-3 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{t.type.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${t.amount > 0 ? "text-success" : "text-secondary"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCredits;
