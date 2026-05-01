import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MockupPreview } from "./MockupPreview";
import { PriceDisplay } from "./PriceDisplay";
import { ProductDescription } from "./ProductDescription";
import { ProductImageGallery } from "./ProductImageGallery";
import { getMarkedUpPrice } from "@/utils/pricing";
import {
  fetchProductDetail,
  fetchPlacementsForVariant,
  generateMockup,
  generateNextMockup,
  listMockupStyleIds,
  PrintfulRateLimitError,
} from "@/services/printful";
import type { PrintfulProduct, PrintfulVariant } from "@/services/printful";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

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
  const [placements, setPlacements] = useState<string[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<string>("");
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const [usedStyleIds, setUsedStyleIds] = useState<number[]>([]);
  const [totalStyles, setTotalStyles] = useState(0);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [moreMockupLoading, setMoreMockupLoading] = useState(false);
  const [mockupAttempted, setMockupAttempted] = useState(false);
  const primaryMockupUrl = mockupUrls[0] || null;
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductDetail(product.id)
      .then((detail) => {
        if (cancelled) return;
        const availableVariants = detail.variants.filter((v) => v.in_stock);
        setVariants(availableVariants.length > 0 ? availableVariants : detail.variants);
        const sizes = [...new Set(detail.variants.map((v) => v.size).filter(Boolean))];
        const colors = [...new Set(detail.variants.map((v) => v.color).filter(Boolean))];
        if (sizes.length) setSelectedSize(sizes[0]);
        if (colors.length) setSelectedColor(colors[0]);
      })
      .catch((err) => console.error("Failed to load product details:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const colorCodes = variants.reduce<Record<string, string>>((acc, v) => {
    if (v.color && v.color_code) acc[v.color] = v.color_code;
    return acc;
  }, {});

  function getSelectedVariant(): PrintfulVariant | undefined {
    return variants.find(
      (v) => (!selectedSize || v.size === selectedSize) && (!selectedColor || v.color === selectedColor),
    );
  }

  const selectedVariant = getSelectedVariant();

  // Build the gallery: all distinct images for the selected color, plus the product hero.
  // Different size variants for the same color sometimes carry slightly different angle
  // shots — we surface them all so the user can browse the product.
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (selectedColor) {
      for (const v of variants) {
        if (v.color === selectedColor && v.image) list.push(v.image);
      }
    } else {
      for (const v of variants) {
        if (v.image) list.push(v.image);
      }
    }
    if (product.image) list.push(product.image);
    return Array.from(new Set(list));
  }, [variants, selectedColor, product.image]);

  // The image actively shown on top. Auto-derived from the selected color, but the
  // user can override it by clicking a thumbnail. Reset whenever the color changes.
  const autoImage = useMemo(() => {
    if (selectedVariant?.image) return selectedVariant.image;
    if (selectedColor) {
      const colorMatch = variants.find((v) => v.color === selectedColor && !!v.image);
      if (colorMatch?.image) return colorMatch.image;
    }
    return product.image;
  }, [selectedVariant, selectedColor, variants, product.image]);

  const [manualImage, setManualImage] = useState<string | null>(null);
  useEffect(() => {
    setManualImage(null);
  }, [selectedColor, selectedVariant?.id]);

  const displayedImage = manualImage || autoImage;

  // Load placements available for the selected variant.
  useEffect(() => {
    if (!selectedVariant) {
      setPlacements([]);
      setSelectedPlacement("");
      return;
    }

    let cancelled = false;
    fetchPlacementsForVariant(product.id, selectedVariant.id)
      .then((p) => {
        if (cancelled) return;
        const uniquePlacements = [...new Set(p)];
        setPlacements(uniquePlacements);
        setSelectedPlacement((prev) => (uniquePlacements.includes(prev) ? prev : uniquePlacements[0] || ""));
      })
      .catch(() => {
        if (!cancelled) {
          setPlacements([]);
          setSelectedPlacement("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, selectedVariant?.id]);

  // Reset mockup state when inputs change.
  useEffect(() => {
    setMockupUrls([]);
    setUsedStyleIds([]);
    setTotalStyles(0);
    setMockupLoading(false);
    setMoreMockupLoading(false);
    setMockupAttempted(false);
  }, [product.id, artworkUrl, selectedVariant?.id, selectedPlacement]);

  async function handlePreviewMockup() {
    if (!artworkUrl || !selectedVariant || !selectedPlacement) return;
    setMockupUrls([]);
    setUsedStyleIds([]);
    setMockupLoading(true);
    setMockupAttempted(false);
    try {
      // Discover total available angles up-front so the UI knows whether
      // to show the "+ generate another angle" button.
      const allIds = await listMockupStyleIds(product.id, selectedVariant.id, selectedPlacement);
      setTotalStyles(allIds.length);

      const { mockupUrl } = await generateMockup({
        productId: product.id,
        variantId: selectedVariant.id,
        placement: selectedPlacement,
        imageUrl: artworkUrl,
      });
      if (mockupUrl) {
        setMockupUrls([mockupUrl]);
        // We don't know exactly which style was picked server-side, but the
        // best-scoring style is always first — track it so the next request
        // moves on to the second-best.
        if (allIds[0]) setUsedStyleIds([allIds[0]]);
      }
    } catch (err) {
      console.error("Mockup generation failed:", err);
      if (err instanceof PrintfulRateLimitError) {
        toast({
          title: "Hang tight — Printful is rate-limiting us",
          description: `Printful only allows about one new mockup per minute. Please try again in ~${err.retryAfter}s.`,
        });
      } else {
        toast({
          title: "Couldn't generate mockup",
          description: "Something went wrong generating the preview. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setMockupLoading(false);
      setMockupAttempted(true);
    }
  }

  async function handleGenerateAnotherMockup() {
    if (!artworkUrl || !selectedVariant || !selectedPlacement) return;
    if (moreMockupLoading) return;
    setMoreMockupLoading(true);
    try {
      const { mockupUrl, mockupStyleId } = await generateNextMockup({
        productId: product.id,
        variantId: selectedVariant.id,
        placement: selectedPlacement,
        imageUrl: artworkUrl,
        usedStyleIds,
      });
      if (mockupUrl) {
        setMockupUrls((prev) => (prev.includes(mockupUrl) ? prev : [...prev, mockupUrl]));
        setManualImage(mockupUrl);
      }
      if (mockupStyleId) {
        setUsedStyleIds((prev) => (prev.includes(mockupStyleId) ? prev : [...prev, mockupStyleId]));
      }
    } catch (err) {
      console.error("Failed to generate additional mockup:", err);
      if (err instanceof PrintfulRateLimitError) {
        toast({
          title: "Hang tight — Printful is rate-limiting us",
          description: `Printful only allows about one new mockup per minute. Please try again in ~${err.retryAfter}s.`,
        });
      } else {
        toast({
          title: "Couldn't generate another angle",
          description: "Something went wrong fetching the next mockup. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setMoreMockupLoading(false);
    }
  }

  const canGenerateMore = mockupUrls.length > 0 && mockupUrls.length < totalStyles;

  const basePriceForDisplay = selectedVariant ? selectedVariant.price : "15.00";

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
        <div className="space-y-3">
          <MockupPreview
            artworkUrl={artworkUrl}
            productTitle={product.title}
            displayedImage={manualImage || primaryMockupUrl || displayedImage}
            mockupUrl={primaryMockupUrl}
            mockupUrls={mockupUrls}
            loading={mockupLoading}
            unavailable={mockupAttempted && mockupUrls.length === 0}
            canPreview={
              !!artworkUrl && !!selectedVariant && !!selectedPlacement && mockupUrls.length === 0 && !mockupLoading
            }
            onPreviewMockup={handlePreviewMockup}
          />
          <ProductImageGallery
            images={[...mockupUrls, ...galleryImages]}
            selected={manualImage || primaryMockupUrl || displayedImage}
            onSelect={(img) => setManualImage(img)}
            onAddMore={canGenerateMore ? handleGenerateAnotherMockup : undefined}
            addMoreLoading={moreMockupLoading}
            addMoreHint={
              mockupUrls.length === 1
                ? "Generate another angle. Heads up — Printful limits us to roughly one mockup per minute, so each new angle takes a moment to render."
                : "Generate another angle (one at a time — Printful is rate-limited)."
            }
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{product.brand}</p>
            <h2 className="font-heading text-2xl font-extrabold text-foreground">{product.title}</h2>
            <PriceDisplay basePrice={basePriceForDisplay} className="text-3xl font-bold text-primary mt-2 block" />
          </div>

          {placements.length > 1 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Placement</label>
              <div className="flex flex-wrap gap-2">
                {placements.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlacement(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                      selectedPlacement === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {p.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <Button
            variant="hero"
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handleAddToOrder}
            disabled={!selectedVariant || adding}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Add to Order
            <PriceDisplay basePrice={basePriceForDisplay} usdOnly className="font-semibold" />
          </Button>

          {!selectedVariant && <p className="text-xs text-destructive">Please select a valid size/color combination</p>}

          {product.description && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
              <ProductDescription description={product.description} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
