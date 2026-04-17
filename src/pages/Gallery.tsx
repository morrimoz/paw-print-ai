import { PublicLayout } from "@/components/PublicLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, checkMockupSupport, fetchProductDetail } from "@/services/printful";
import type { PrintfulProduct } from "@/services/printful";
import { getStartingPrice } from "@/utils/pricing";

// In-memory cache so we don't refetch the same product detail twice in a session.
const startingPriceCache = new Map<number, string>();
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
  const [mockupSupported, setMockupSupported] = useState<PrintfulProduct[]>([]);
  const [mockupLoading, setMockupLoading] = useState(true);
  const [startingPrices, setStartingPrices] = useState<Record<number, string>>({});
  const gridRef = useScrollReveal<HTMLDivElement>(".reveal");

  // Build a horizontal carousel of products that support live Printful V2 mockups.
  // We probe candidates 3 at a time so we don't hit Printful's 429 rate limit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMockupLoading(true);
      try {
        const candidates: PrintfulProduct[] = [];
        for (const catId of [21, 24, 112, 16]) {
          try {
            const prods = await fetchProducts(catId);
            candidates.push(...prods.filter((p) => !p.is_discontinued).slice(0, 6));
          } catch { /* skip */ }
        }
        const seen = new Set<number>();
        const unique = candidates.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

        // Probe in batches of 3 — kind to Printful's rate limits, fast enough for UX.
        const supported: PrintfulProduct[] = [];
        const batchSize = 3;
        for (let i = 0; i < unique.length && supported.length < 12; i += batchSize) {
          if (cancelled) return;
          const batch = unique.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (p) => ({ p, ok: await checkMockupSupport(p.id).catch(() => false) }))
          );
          for (const { p, ok } of results) {
            if (ok && supported.length < 12) supported.push(p);
          }
          // Tiny pause between batches to be extra polite.
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!cancelled) setMockupSupported(supported);
      } finally {
        if (!cancelled) setMockupLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Lazily fetch real "from" prices for the currently displayed products.
  useEffect(() => {
    let cancelled = false;
    const toFetch = products.filter((p) => !startingPriceCache.has(p.id));
    if (toFetch.length === 0) {
      // hydrate from cache
      const fromCache: Record<number, string> = {};
      products.forEach((p) => {
        const v = startingPriceCache.get(p.id);
        if (v) fromCache[p.id] = v;
      });
      if (Object.keys(fromCache).length) setStartingPrices((s) => ({ ...s, ...fromCache }));
      return;
    }
    (async () => {
      // Fetch in small batches to avoid hammering the API
      const batchSize = 4;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        if (cancelled) return;
        const batch = toFetch.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (p) => {
            try {
              const detail = await fetchProductDetail(p.id);
              const prices = (detail?.variants || []).map((v) => v.price).filter(Boolean);
              const display = getStartingPrice(prices.length ? prices : ["15.00"]);
              startingPriceCache.set(p.id, display);
              return [p.id, display] as const;
            } catch {
              return [p.id, getStartingPrice(["15.00"])] as const;
            }
          })
        );
        if (cancelled) return;
        setStartingPrices((s) => {
          const next = { ...s };
          results.forEach(([id, price]) => { next[id] = price; });
          return next;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [products]);

  return (
    <PublicLayout>
      <section className="relative bg-aurora grain-overlay py-16 md:py-24">
        <div className="container relative z-10">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            Merchandise Gallery
          </h1>
          <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
            Browse our full catalog of premium products - every item can be customized with your AI-generated pet art.
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

      {/* Live Mockup carousel - only products that support real Printful mockups */}
      <section className="pt-12 md:pt-16">
        <div className="container">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
              See your art on these
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            These products generate a real photo-mockup of your AI pet art - perfect for previewing.
          </p>
          {mockupLoading && mockupSupported.length === 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 px-0 py-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44">
                  <div className="aspect-square rounded-xl bg-muted animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 mt-2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : mockupSupported.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mockup-ready products right now.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory mx-[4px] px-[6px]">
              {mockupSupported.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="flex-shrink-0 w-44 snap-start group py-0 pt-[10px] px-[4px]"
                >
                  <div className="aspect-square rounded-xl overflow-hidden glass-card card-lift ring-gradient-hover">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110 px-[12px]"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
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
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="reveal group rounded-2xl glass-card overflow-hidden card-lift ring-gradient-hover transition-all duration-300 cursor-pointer block"
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
                      {startingPrices[p.id]
                        ? <>From {startingPrices[p.id]}</>
                        : <span className="inline-block h-4 w-16 bg-muted rounded animate-pulse" />}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Gallery;
