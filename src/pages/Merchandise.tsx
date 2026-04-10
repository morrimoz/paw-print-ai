import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductDetail } from "@/components/ProductDetail";
import { fetchProducts } from "@/services/printful";
import { UI_CATEGORIES } from "@/utils/productCategorization";
import type { PrintfulProduct, PrintfulVariant } from "@/services/printful";
import { toast } from "sonner";
import { Image, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Merchandise = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const artwork = location.state?.artwork;
  const artworkUrl = artwork?.generated_image_url;

  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("wall-art");
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());

  const loadCategoryProducts = useCallback(async (categoryId: string) => {
    if (loadedCategories.has(categoryId)) return;
    
    setLoading(true);
    try {
      const uiCat = UI_CATEGORIES.find((c) => c.id === categoryId);
      if (!uiCat) return;
      
      // Fetch products for each Printful category and merge
      const allProducts: PrintfulProduct[] = [];
      for (const pfCatId of uiCat.printfulCategoryIds) {
        const prods = await fetchProducts(pfCatId);
        allProducts.push(...prods);
      }
      
      // Deduplicate and filter discontinued
      const uniqueProducts = allProducts
        .filter((p) => !p.is_discontinued)
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
      
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...uniqueProducts.filter((p) => !existingIds.has(p.id))];
      });
      
      setLoadedCategories((prev) => new Set(prev).add(categoryId));
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadedCategories]);

  useEffect(() => {
    loadCategoryProducts(activeCategory);
  }, [activeCategory, loadCategoryProducts]);

  // Products for the active category
  const activeCategoryConfig = UI_CATEGORIES.find((c) => c.id === activeCategory);
  const activePrintfulIds = new Set(activeCategoryConfig?.printfulCategoryIds || []);
  
  const filteredProducts = products.filter((p) => {
    // Check main_category_id or parent category match
    const mainCatId = (p as unknown as { main_category_id?: number }).main_category_id;
    if (mainCatId && activePrintfulIds.has(mainCatId)) return true;
    // Also check via all parent categories in the chain
    return activeCategoryConfig?.printfulCategoryIds.some((catId) => {
      return products.some((prod) => prod.id === p.id);
    }) && loadedCategories.has(activeCategory);
  });

  // Since we load by category, just show all loaded products for the active category
  const displayProducts = loadedCategories.has(activeCategory)
    ? products.filter(() => true) // we need better filtering
    : [];

  function handleAddToOrder(variant: PrintfulVariant, price: number) {
    toast.success(`${variant.name} added! Redirecting to checkout...`);
    navigate("/checkout", {
      state: {
        artwork,
        orderItem: {
          variant_id: variant.id,
          variant_name: variant.name,
          product_title: selectedProduct?.title,
          product_image: selectedProduct?.image,
          size: variant.size,
          color: variant.color,
          price,
          artwork_url: artworkUrl,
        },
      },
    });
  }

  if (!artwork) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Artwork Selected</h2>
          <p className="text-muted-foreground mb-6">Create some art first, then come back to order merchandise.</p>
          <Button variant="hero" asChild>
            <Link to="/create-art">Create Art</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {selectedProduct ? (
          <ProductDetail
            product={selectedProduct}
            artworkUrl={artworkUrl}
            onBack={() => setSelectedProduct(null)}
            onAddToOrder={handleAddToOrder}
          />
        ) : (
          <>
            <div className="mb-8">
              <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground mb-4">
                <Link to="/artwork-preview" state={{ artwork }}>
                  <ArrowLeft className="h-4 w-4" /> Back to Artwork
                </Link>
              </Button>
              <h1 className="font-heading text-3xl font-extrabold text-foreground">
                Put Your Art on Products
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse our catalog and see your artwork on premium merchandise
              </p>
            </div>

            {/* Artwork Preview Banner */}
            <div className="bg-card rounded-xl shadow-card p-4 mb-8 flex items-center gap-4">
              <img src={artworkUrl} alt="Your artwork" className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your Artwork</p>
                <p className="text-xs text-muted-foreground capitalize">{artwork.style} style</p>
              </div>
            </div>

            {/* Category Navigation + Product Grid */}
            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-56 flex-shrink-0">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Categories
                </h3>
                <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {UI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSelectedProduct(null);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        activeCategory === cat.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </nav>
              </aside>

              <div className="flex-1">
                <ProductGrid
                  products={displayProducts}
                  loading={loading && !loadedCategories.has(activeCategory)}
                  artworkUrl={artworkUrl}
                  onPreview={setSelectedProduct}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Merchandise;
