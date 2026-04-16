import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refreshProfile } = useAuth();

  useEffect(() => {
    // Refresh profile so newly-credited treats show up immediately.
    // The webhook may take a few seconds — refresh once after a short delay too.
    refreshProfile();
    const t = setTimeout(() => refreshProfile(), 2500);
    return () => clearTimeout(t);
  }, [refreshProfile]);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Payment confirmed!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for your purchase. Treats are credited to your account, and merchandise orders are sent to fulfillment within minutes.
        </p>
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
