import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "@/services/printful";
import type { PrintfulProduct } from "@/services/printful";
import { Sparkles } from "lucide-react";

// Small module-level cache so we don't refetch across product page navigations.
let cached: PrintfulProduct[] | null = null;

interface PeopleAlsoBoughtProps {
  excludeId?: number;
}

/**
 * Lightweight "people also bought" carousel — uses cheap V1 catalog list,
 * never the heavy per-product detail endpoint, so it's safe to render on every
 * product page without hitting Printful's rate limit.
 */
export function PeopleAlsoBought({ excludeId }: PeopleAlsoBoughtProps) {
  const [items, setItems] = useState<PrintfulProduct[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    (async () => {
      try {
        // Mix a few popular categories: drinkware, wall art, accessories, clothing.
        const buckets = await Promise.all(
          [112, 21, 15, 6].map((id) => fetchProducts(id).catch(() => []))
        );
        const flat: PrintfulProduct[] = [];
        // Round-robin pick 2-3 from each so the row is visually varied.
        const lengths = buckets.map((b) => b.filter((p) => !p.is_discontinued));
        for (let i = 0; i < 4; i++) {
          for (const b of lengths) {
            if (b[i]) flat.push(b[i]);
          }
        }
        const seen = new Set<number>();
        const unique = flat.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
        cached = unique.slice(0, 12);
        if (!cancelled) setItems(cached);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = items.filter((p) => p.id !== excludeId).slice(0, 10);

  if (!loading && visible.length === 0) return null;

  return (
    <section className="mt-16 md:mt-20 border-t border-border pt-10">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          People also bought these
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Other popular ways to put your pet on something you'll love.
      </p>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <div className="aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-3 bg-muted rounded w-3/4 mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory px-[6px]">
          {visible.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="flex-shrink-0 w-44 snap-start group"
            >
              <div className="aspect-square rounded-xl overflow-hidden glass-card card-lift ring-gradient-hover">
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {p.title}
              </p>
              {p.brand && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.brand}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
