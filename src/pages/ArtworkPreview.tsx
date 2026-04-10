import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Download, ShoppingBag, Image, Sparkles } from "lucide-react";

const FEATURED_PRODUCTS = [
  { name: "Canvas Print", emoji: "🖼️", price: "$52.49" },
  { name: "Premium Poster", emoji: "📜", price: "$22.49" },
  { name: "Unisex Hoodie", emoji: "🧥", price: "$44.99" },
  { name: "Classic T-Shirt", emoji: "👕", price: "$26.99" },
  { name: "Ceramic Mug", emoji: "☕", price: "$17.99" },
  { name: "Framed Print", emoji: "🖼️", price: "$44.99" },
];

const ArtworkPreview = () => {
  const location = useLocation();
  const artwork = location.state?.artwork;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl font-extrabold text-foreground mb-8">Your Artwork</h1>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
            {artwork?.generated_image_url ? (
              <img
                src={artwork.generated_image_url}
                alt="Generated pet art"
                className="w-full h-full object-contain p-4"
              />
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
              <p className="text-sm text-muted-foreground mb-4">
                Style: <span className="font-medium text-foreground capitalize">{artwork.style}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={artwork.generated_image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Download HD
                  </a>
                </Button>
                <Button variant="hero" className="flex-1" asChild>
                  <Link to="/merchandise" state={{ artwork }}>
                    <ShoppingBag className="h-4 w-4 mr-2" /> Order Merchandise
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Featured Products Section */}
        {artwork && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                See Your Pet on Products
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {FEATURED_PRODUCTS.map((product) => (
                <Link
                  key={product.name}
                  to="/merchandise"
                  state={{ artwork }}
                  className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer hover:-translate-y-1 group"
                >
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                    <img
                      src={artwork.generated_image_url}
                      alt={product.name}
                      className="w-3/4 h-3/4 object-contain rounded-md"
                    />
                    <div className="absolute top-2 left-2 text-2xl">{product.emoji}</div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">From {product.price}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ArtworkPreview;
