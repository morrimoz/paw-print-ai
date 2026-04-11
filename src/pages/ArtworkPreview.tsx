import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Download, ShoppingBag, Image, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchProducts } from "@/services/printful";
import type { PrintfulProduct } from "@/services/printful";
import { getStartingPrice } from "@/utils/pricing";

const ArtworkPreview = () => {
  const location = useLocation();
  const artwork = location.state?.artwork;
  const [featuredProducts, setFeaturedProducts] = useState<PrintfulProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (artwork) {
      loadFeaturedProducts();
    }
  }, [artwork]);

  async function loadFeaturedProducts() {
    setLoadingProducts(true);
    try {
      // Fetch from a few categories to get a mix of products
      const categoryIds = [21, 24, 112]; // Wall art, T-shirts, Drinkware
      const allProducts: PrintfulProduct[] = [];
      for (const catId of categoryIds) {
        try {
          const prods = await fetchProducts(catId);
          allProducts.push(...prods.slice(0, 2)); // Take 2 from each
        } catch {
          // skip failed categories
        }
      }
      setFeaturedProducts(allProducts.filter(p => !p.is_discontinued).slice(0, 6));
    } catch (err) {
      console.error("Failed to load featured products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }

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

        {/* Featured Products Section - Real Printful products */}
        {artwork && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                See Your Pet on Products
              </h2>
            </div>
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {featuredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to="/merchandise"
                    state={{ artwork }}
                    className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer hover:-translate-y-1 group"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-contain p-3"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">From {getStartingPrice(["15.00"])}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ArtworkPreview;
