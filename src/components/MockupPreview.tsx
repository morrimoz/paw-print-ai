import { Loader2, Image as ImageIcon } from "lucide-react";

interface MockupPreviewProps {
  artworkUrl: string;
  productImage?: string;
  productTitle: string;
  mockupUrl?: string | null;
  loading?: boolean;
}

/**
 * Renders a Printful-generated mockup. Never overlays the artwork on the product photo —
 * if a real mockup is unavailable, we show the bare product image with a graceful loading
 * state explaining that the mockup is being generated.
 */
export function MockupPreview({
  artworkUrl,
  productImage,
  productTitle,
  mockupUrl,
  loading,
}: MockupPreviewProps) {
  // Real Printful mockup ready — render it.
  if (mockupUrl) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
        <img
          src={mockupUrl}
          alt={`${productTitle} preview with your pet art`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Loading: show product image at low opacity with a spinner overlay.
  if (loading) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
        {productImage && (
          <img
            src={productImage}
            alt={productTitle}
            className="w-full h-full object-contain p-6 opacity-30"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-foreground font-medium">Rendering your mockup…</p>
          <p className="text-xs text-muted-foreground">Printful is placing your art on the product</p>
        </div>
      </div>
    );
  }

  // Mockup unavailable — show bare product photo with explainer (no overlay).
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
      {productImage ? (
        <img
          src={productImage}
          alt={productTitle}
          className="w-full h-full object-contain p-6"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3 glass-card-strong rounded-lg p-2 text-center">
        <p className="text-[11px] text-muted-foreground">
          Mockup preview unavailable for this product — your art will be applied at print time.
        </p>
      </div>
    </div>
  );
}
