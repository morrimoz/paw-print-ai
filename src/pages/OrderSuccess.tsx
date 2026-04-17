import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refreshProfile, user } = useAuth();
  const [bonusTreats, setBonusTreats] = useState<number | null>(null);

  // Refresh profile so newly-credited treats show up immediately.
  // Webhook can take a few seconds — refresh again after a delay.
  useEffect(() => {
    refreshProfile();
    const t = setTimeout(() => refreshProfile(), 2500);
    return () => clearTimeout(t);
  }, [refreshProfile]);

  // Detect merch_bonus credit_transaction for this session and reveal a celebratory callout.
  useEffect(() => {
    if (!sessionId || !user) return;
    let cancelled = false;
    let attempts = 0;

    async function check() {
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount, type")
        .eq("user_id", user.id)
        .eq("stripe_checkout_session_id", sessionId)
        .eq("type", "merch_bonus")
        .maybeSingle();
      if (cancelled) return;
      if (data?.amount) {
        setBonusTreats(data.amount);
        // Tell the navbar to pulse on the next render.
        window.dispatchEvent(new CustomEvent("treats:bonus", { detail: data.amount }));
        await refreshProfile();
        return;
      }
      attempts += 1;
      if (attempts < 8) setTimeout(check, 2000);
    }
    check();
    return () => { cancelled = true; };
  }, [sessionId, user, refreshProfile]);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Payment confirmed!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for your purchase. Treats are credited to your account, and merchandise orders are sent to fulfillment within minutes.
        </p>

        {bonusTreats && (
          <div className="mt-6 mx-auto rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-5 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Gift className="h-5 w-5" />
              <p className="font-heading text-lg font-bold">+{bonusTreats} free treats added!</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              On the house for ordering merch. Use them to generate more pet art.
            </p>
          </div>
        )}

        {sessionId && (
          <p className="mt-2 text-xs text-muted-foreground/70">Reference: {sessionId.slice(-12)}</p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/my-orders">View My Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/my-treats">View Treats</Link>
          </Button>
          <Button asChild>
            <Link to="/create-art">
              <Sparkles className="mr-1 h-4 w-4" /> Create art <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderSuccess;
