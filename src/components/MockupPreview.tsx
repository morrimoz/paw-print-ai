interface MockupPreviewProps {
  artworkUrl: string;
  productImage?: string;
  productTitle: string;
  mockupUrl?: string | null;
  loading?: boolean;
}

export function MockupPreview({ artworkUrl, productImage, productTitle, mockupUrl, loading }: MockupPreviewProps) {
  if (loading) {
    return (
      <div className="aspect-square bg-muted rounded-xl flex items-center justify-center animate-pulse">
        <p className="text-muted-foreground text-sm">Generating preview...</p>
      </div>
    );
  }

  // If we have a real mockup URL from Printful, show it
  if (mockupUrl) {
    return (
      <div className="aspect-square bg-muted rounded-xl overflow-hidden">
        <img src={mockupUrl} alt={`${productTitle} mockup`} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback: show product image with artwork overlay
  return (
    <div className="aspect-square bg-muted rounded-xl overflow-hidden relative">
      {productImage && (
        <img src={productImage} alt={productTitle} className="w-full h-full object-contain p-6 opacity-80" />
      )}
      {/* Artwork overlay - centered on product */}
      <div className="absolute inset-0 flex items-center justify-center p-12">
        <div className="relative w-2/3 aspect-square">
          <img
            src={artworkUrl}
            alt="Your artwork"
            className="w-full h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
