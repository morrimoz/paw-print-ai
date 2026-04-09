import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Download, ShoppingBag } from "lucide-react";

const ArtworkPreview = () => {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">Your Artwork</h1>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Generated artwork will appear here</p>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Download HD
              </Button>
              <Button variant="hero" className="flex-1" asChild>
                <Link to="/checkout">
                  <ShoppingBag className="h-4 w-4 mr-2" /> Order Merchandise
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Available Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["Canvas Print", "Framed Poster", "Coffee Mug"].map((product) => (
              <div key={product} className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer hover:-translate-y-0.5 transition-transform">
                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{product}</h3>
                <p className="text-xs text-muted-foreground mt-1">From $24.99</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ArtworkPreview;
