import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

const MyOrders = () => {
  const orders: any[] = [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">My Orders</h1>

        {orders.length === 0 ? (
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
            {/* Order cards would go here */}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyOrders;
