import { PublicLayout } from "@/components/PublicLayout";
import { useEffect, useState } from "react";
import { fetchCategories, fetchProducts } from "@/services/printful";
import type { PrintfulCategory, PrintfulProduct } from "@/services/printful";
import { getStartingPrice } from "@/utils/pricing";
import { Loader2, PackageOpen, Frame, Shirt, Coffee, Backpack, Home, Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface UICategory {
  id: string;
  label: string;
  icon: typeof Frame;
  printfulCategoryIds: number[];
}

// Curated, customer-friendly category groupings backed by real Printful category IDs
const UI_CATEGORIES: UICategory[] = [
  { id: "all", label: "All", icon: Sparkles, printfulCategoryIds: [21, 24, 6, 7, 112, 16, 15] },
  { id: "wall-art", label: "Wall Art", icon: Frame, printfulCategoryIds: [21] },
  { id: "clothing", label: "Clothing", icon: Shirt, printfulCategoryIds: [6, 7] },
  { id: "drinkware", label: "Drinkware", icon: Coffee, printfulCategoryIds: [112] },
  { id: "accessories", label: "Accessories", icon: Backpack, printfulCategoryIds: [16, 15] },
  { id: "home", label: "Home & Living", icon: Home, printfulCategoryIds: [5] },
];

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [productsByCat, setProductsByCat] = useState<Record<string, PrintfulProduct[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useScrollReveal<HTMLDivElement>(".reveal");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (productsByCat[activeCategory]) return;
      setLoading(true);
      setError(null);
      try {
        const ui = UI_CATEGORIES.find((c) => c.id === activeCategory)!;
        const all: PrintfulProduct[] = [];
        for (const id of ui.printfulCategoryIds) {
          try {
            const ps = await fetchProducts(id);
            all.push(...ps);
          } catch (e) {
            console.error("category", id, e);
          }
        }
        const dedup = all
          .filter((p) => !p.is_discontinued)
          .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
        if (!cancelled) {
          setProductsByCat((prev) => ({ ...prev, [activeCategory]: dedup }));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const products = productsByCat[activeCategory] || [];

  return (
    <PublicLayout>
      <section className="relative bg-aurora grain-overlay py-16 md:py-24">
        <div className="container relative z-10">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            Merchandise Gallery
          </h1>
          <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
            Browse our full catalog of premium products — every item can be customized with your AI-generated pet art.
          </p>

          {/* Category filters */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {UI_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "glass-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={gridRef} className="py-12 md:py-16">
        <div className="container">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl bg-card p-4 shadow-sm animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center text-center py-16 text-muted-foreground">
              <PackageOpen className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium text-foreground">Couldn't load products</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="flex flex-col items-center text-center py-16 text-muted-foreground">
              <PackageOpen className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium text-foreground">No products in this category yet</p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="reveal group rounded-2xl glass-card overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.brand && `${p.brand} · `}
                      {p.variant_count} variants
                    </p>
                    <p className="text-sm font-bold text-primary mt-2">
                      From {getStartingPrice(["15.00"])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Gallery;
