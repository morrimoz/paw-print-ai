import { getStartingPrice } from "@/utils/pricing";
import type { PrintfulProduct } from "@/services/printful";

interface ProductCardProps {
  product: PrintfulProduct;
  artworkUrl?: string;
  onPreview: (product: PrintfulProduct) => void;
}

export function ProductCard({ product, artworkUrl, onPreview }: ProductCardProps) {
  return (
    <div
      onClick={() => onPreview(product)}
      className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain p-4"
          loading="lazy"
        />
        {artworkUrl && (
          <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground font-medium">Click to preview with your art</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {product.brand && `${product.brand} · `}{product.variant_count} variants
        </p>
        <span className="text-sm font-bold text-primary">
          From {getStartingPrice(["15.00"])}
        </span>
      </div>
    </div>
  );
}
