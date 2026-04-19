import { Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockupPreviewProps {
  artworkUrl: string;
  productTitle: string;
  productImage?: string | null;
  mockupUrl?: string | null;
  loading?: boolean;
  /** True only after we tried to generate a mockup and got nothing back. */
  unavailable?: boolean;
  /** When provided, shows a "Preview Mockup" button overlay on the product image. */
  onPreviewMockup?: () => void;
  /** Hides the preview button (e.g. before artwork is selected). */
  canPreview?: boolean;
}

/**
 * Renders the product image by default. If the user clicks "Preview Mockup", we trigger
 * the parent to generate a Printful mockup and swap the image in once ready.
 */
export function MockupPreview({
  artworkUrl,
  productTitle,
  productImage,
  mockupUrl,
  loading,
  unavailable,
  onPreviewMockup,
  canPreview,
}: MockupPreviewProps) {
  // Real Printful mockup ready - render it with a BETA disclaimer below.
  if (mockupUrl) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
          <img
            src={mockupUrl}
            alt={`${productTitle} preview with your pet art`}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
          <span className="inline-flex items-center justify-center rounded-md bg-primary/15 text-primary text-[10px] font-extrabold tracking-wider px-2 py-1 shrink-0">
            BETA
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mockup previews are an approximation. Some products may not render the artwork
            perfectly here — at print time your art is precisely placed using your selected
            placement and the final product will look better than this preview.
          </p>
        </div>
      </div>
    );
  }

  // Loading: show product image underneath, with a spinner overlay.
  if (loading) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card bg-muted/40">
        {productImage ? (
          <img
            key={productImage}
            src={productImage}
            alt={productTitle}
            className="w-full h-full object-contain opacity-60"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-foreground font-medium">Rendering your mockup…</p>
          <p className="text-xs text-muted-foreground">Printful is placing your art on the product</p>
        </div>
      </div>
    );
  }

  // Default: show the product image with an optional "Preview Mockup" button.
  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card bg-muted/40">
        {productImage ? (
          <img
            key={productImage}
            src={productImage}
            alt={productTitle}
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {canPreview && onPreviewMockup && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/90 via-background/60 to-transparent">
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              onClick={onPreviewMockup}
            >
              <Sparkles className="h-4 w-4" /> Preview Mockup
            </Button>
          </div>
        )}

        {unavailable && artworkUrl && (
          <div className="absolute top-3 left-3 right-3 glass-card-strong rounded-lg p-2 text-center">
            <p className="text-[11px] text-muted-foreground">
              Mockup preview unavailable for this product - your art will be applied at print time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
