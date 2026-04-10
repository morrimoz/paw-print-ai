import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductGridSkeleton";
import type { PrintfulProduct } from "@/services/printful";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: PrintfulProduct[];
  loading: boolean;
  artworkUrl?: string;
  onPreview: (product: PrintfulProduct) => void;
}

export function ProductGrid({ products, loading, artworkUrl, onPreview }: ProductGridProps) {
  if (loading) return <ProductGridSkeleton count={6} />;

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <PackageOpen className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">No products found in this category</p>
        <p className="text-xs mt-1">Try selecting a different category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          artworkUrl={artworkUrl}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
