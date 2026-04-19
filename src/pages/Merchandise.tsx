import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductDetail } from "@/components/ProductDetail";
import { fetchProducts } from "@/services/printful";
import { UI_CATEGORIES } from "@/utils/productCategorization";
import type { PrintfulProduct, PrintfulVariant } from "@/services/printful";
import { toast } from "sonner";
import { Image, ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Merchandise = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const artwork = location.state?.artwork;
  const artworkUrl = artwork?.generated_image_url;

  const [categoryProducts, setCategoryProducts] = useState<Record<string, PrintfulProduct[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("wall-art");
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArtworkOverlay, setShowArtworkOverlay] = useState(false);

  useEffect(() => {
    if (!categoryProducts[activeCategory]) {
      loadCategoryProducts(activeCategory);
    }
  }, [activeCategory]);

  // Lock body scroll when overlay open
  useEffect(() => {
    if (!showArtworkOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowArtworkOverlay(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showArtworkOverlay]);

  async function loadCategoryProducts(categoryId: string) {
    setLoading(true);
    try {
      const uiCat = UI_CATEGORIES.find((c) => c.id === categoryId);
      if (!uiCat) return;

      const allProducts: PrintfulProduct[] = [];
      for (const pfCatId of uiCat.printfulCategoryIds) {
        const prods = await fetchProducts(pfCatId);
        allProducts.push(...prods);
      }

      const uniqueProducts = allProducts
        .filter((p) => !p.is_discontinued)
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

      setCategoryProducts((prev) => ({ ...prev, [categoryId]: uniqueProducts }));
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const categoryList = categoryProducts[activeCategory] || [];

  const displayProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryList;
    return categoryList.filter((p) => {
      const haystack = `${p.title} ${p.brand ?? ""} ${p.type_name ?? ""} ${p.model ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [categoryList, searchQuery]);

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

              {/* Header row: title left, artwork thumbnail right */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading text-3xl font-extrabold text-foreground">
                    Put Your Art on Products
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Browse our catalog and see your artwork on premium merchandise
                  </p>
                </div>
                {artworkUrl && (
                  <button
                    type="button"
                    onClick={() => setShowArtworkOverlay(true)}
                    className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden glass-card-strong ring-1 ring-border hover:ring-primary transition-all"
                    aria-label="View your artwork full size"
                  >
                    <img src={artworkUrl} alt="Your artwork" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products (e.g. mug, t-shirt, canvas)…"
                className="pl-10 pr-10 h-11"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-56 flex-shrink-0">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Categories
                </h3>
                <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {UI_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
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
                        <Icon className="h-4 w-4" />
                        {cat.label}
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <div className="flex-1">
                <ProductGrid
                  products={displayProducts}
                  loading={loading}
                  artworkUrl={artworkUrl}
                  onPreview={setSelectedProduct}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Artwork lightbox overlay */}
      {showArtworkOverlay && artworkUrl && (
        <div
          className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setShowArtworkOverlay(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setShowArtworkOverlay(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full glass-card-strong flex items-center justify-center text-foreground hover:text-primary transition-colors"
            aria-label="Close artwork preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={artworkUrl}
            alt="Your artwork - full size"
            className="max-w-[95vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Merchandise;
