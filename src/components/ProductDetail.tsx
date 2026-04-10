import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MockupPreview } from "./MockupPreview";
import { getDisplayPrice, getMarkedUpPrice } from "@/utils/pricing";
import { fetchProductDetail, createMockup } from "@/services/printful";
import type { PrintfulProduct, PrintfulVariant } from "@/services/printful";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductDetailProps {
  product: PrintfulProduct;
  artworkUrl: string;
  onBack: () => void;
  onAddToOrder: (variant: PrintfulVariant, price: number) => void;
}

export function ProductDetail({ product, artworkUrl, onBack, onAddToOrder }: ProductDetailProps) {
  const [variants, setVariants] = useState<PrintfulVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [product.id]);

  async function loadProduct() {
    setLoading(true);
    try {
      const detail = await fetchProductDetail(product.id);
      const availableVariants = detail.variants.filter(
        (v) => v.in_stock || v.availability_status === "active"
      );
      setVariants(availableVariants.length > 0 ? availableVariants : detail.variants);
      
      // Auto-select first size and color
      const sizes = [...new Set(detail.variants.map((v) => v.size).filter(Boolean))];
      const colors = [...new Set(detail.variants.map((v) => v.color).filter(Boolean))];
      if (sizes.length) setSelectedSize(sizes[0]);
      if (colors.length) setSelectedColor(colors[0]);
    } catch (err) {
      console.error("Failed to load product details:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Try to generate mockup
    async function loadMockup() {
      if (!artworkUrl) return;
      setMockupLoading(true);
      try {
        const selectedVariant = getSelectedVariant();
        const result = await createMockup(
          product.id,
          artworkUrl,
          selectedVariant ? [selectedVariant.id] : undefined
        );
        if (!result.fallback && result.mockups?.length > 0) {
          setMockupUrl(result.mockups[0].mockup_url);
        }
      } catch {
        // Fallback to overlay
      } finally {
        setMockupLoading(false);
      }
    }
    loadMockup();
  }, [product.id, artworkUrl]);

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const colorCodes = variants.reduce<Record<string, string>>((acc, v) => {
    if (v.color && v.color_code) acc[v.color] = v.color_code;
    return acc;
  }, {});

  function getSelectedVariant(): PrintfulVariant | undefined {
    return variants.find(
      (v) =>
        (!selectedSize || v.size === selectedSize) &&
        (!selectedColor || v.color === selectedColor)
    );
  }

  const selectedVariant = getSelectedVariant();
  const displayPrice = selectedVariant
    ? getDisplayPrice(selectedVariant.price)
    : getDisplayPrice("15.00");

  function handleAddToOrder() {
    if (!selectedVariant) return;
    setAdding(true);
    const price = getMarkedUpPrice(selectedVariant.price);
    onAddToOrder(selectedVariant, price);
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mockup Preview */}
        <MockupPreview
          artworkUrl={artworkUrl}
          productImage={product.image}
          productTitle={product.title}
          mockupUrl={mockupUrl}
          loading={mockupLoading}
        />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{product.brand}</p>
            <h2 className="font-heading text-2xl font-extrabold text-foreground">{product.title}</h2>
            <p className="text-3xl font-bold text-primary mt-2">{displayPrice}</p>
          </div>

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Color: <span className="text-muted-foreground">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: colorCodes[color] || "#ccc" }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add to Order */}
          <Button
            variant="hero"
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handleAddToOrder}
            disabled={!selectedVariant || adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Add to Order — {displayPrice}
          </Button>

          {!selectedVariant && (
            <p className="text-xs text-destructive">
              Please select a valid size/color combination
            </p>
          )}

          {product.description && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
