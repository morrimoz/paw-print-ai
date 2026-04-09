import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Download, ShoppingBag, Image } from "lucide-react";

const ArtworkPreview = () => {
  const location = useLocation();
  const artwork = location.state?.artwork;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">Your Artwork</h1>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            {artwork?.generated_image_url ? (
              <img src={artwork.generated_image_url} alt="Generated pet art" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Image className="h-12 w-12" />
                <p className="text-sm">No artwork to display</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/create-art">Create Art</Link>
                </Button>
              </div>
            )}
          </div>
          {artwork && (
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">Style: <span className="font-medium text-foreground capitalize">{artwork.style}</span></p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={artwork.generated_image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Download HD
                  </a>
                </Button>
                <Button variant="hero" className="flex-1" asChild>
                  <Link to="/checkout" state={{ artwork }}>
                    <ShoppingBag className="h-4 w-4 mr-2" /> Order Merchandise
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {artwork && (
          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Available Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "Canvas Print", price: "$34.99" },
                { name: "Framed Poster", price: "$29.99" },
                { name: "Coffee Mug", price: "$19.99" },
              ].map((product) => (
                <div key={product.name} className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer hover:-translate-y-0.5">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <img src={artwork.generated_image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">From {product.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ArtworkPreview;
