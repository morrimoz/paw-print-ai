import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";

const OrderSuccess = () => {
  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Order Confirmed!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for your purchase. Your order is being processed and you'll receive a confirmation email shortly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/my-orders">View My Orders</Link>
          </Button>
          <Button asChild>
            <Link to="/create-art">Create More Art <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderSuccess;
