import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MyOrders = () => {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">My Orders</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-lg font-semibold text-foreground">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Start creating art and order custom merchandise!</p>
            <Button className="mt-6" asChild>
              <Link to="/create-art">Create Art</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-card rounded-xl shadow-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{order.product_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} · Qty: {order.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">${Number(order.total_amount).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === "completed" ? "bg-success/10 text-success" :
                    order.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyOrders;
