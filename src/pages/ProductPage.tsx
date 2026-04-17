import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchProductDetail,
  fetchPlacementsForVariant,
  generateMockup,
} from "@/services/printful";
import type { PrintfulProduct, PrintfulVariant } from "@/services/printful";
import { MockupPreview } from "@/components/MockupPreview";
import { PeopleAlsoBought } from "@/components/PeopleAlsoBought";
import { getDisplayPrice, getMarkedUpPrice } from "@/utils/pricing";
import { ArrowLeft, ShoppingCart, Upload, Sparkles, ImagePlus, Loader2, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Artwork {
  id: string;
  generated_image_url: string | null;
  style: string;
  created_at: string;
}

const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<PrintfulProduct | null>(null);
  const [variants, setVariants] = useState<PrintfulVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  const [placements, setPlacements] = useState<string[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<string>("");

  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupAttempted, setMockupAttempted] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [myArtworks, setMyArtworks] = useState<Artwork[]>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchProductDetail(Number(productId))
      .then((detail) => {
        setProduct(detail.product);
        const available = detail.variants.filter((v) => v.in_stock);
        setVariants(available.length > 0 ? available : detail.variants);
        const sizes = [...new Set(detail.variants.map((v) => v.size).filter(Boolean))];
        const colors = [...new Set(detail.variants.map((v) => v.color).filter(Boolean))];
        if (sizes.length) setSelectedSize(sizes[0]);
        if (colors.length) setSelectedColor(colors[0]);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't load this product.");
      })
      .finally(() => setLoading(false));
  }, [productId]);

  function getSelectedVariant(): PrintfulVariant | undefined {
    return variants.find(
      (v) =>
        (!selectedSize || v.size === selectedSize) &&
        (!selectedColor || v.color === selectedColor)
    );
  }

  const selectedVariant = getSelectedVariant();

  // Load available placements for the selected variant.
  useEffect(() => {
    if (!product || !selectedVariant) return;
    let cancelled = false;
    fetchPlacementsForVariant(product.id, selectedVariant.id)
      .then((p) => {
        if (cancelled) return;
        const uniquePlacements = [...new Set(p)];
        setPlacements(uniquePlacements);
        setSelectedPlacement((prev) => (uniquePlacements.includes(prev) ? prev : (uniquePlacements[0] || "")));
      })
      .catch(() => {
        if (!cancelled) setPlacements([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id, selectedVariant?.id]);

  // Generate Printful V2 mockup whenever variant OR placement changes.
  useEffect(() => {
    if (!artworkUrl || !product || !selectedVariant || !selectedPlacement) {
      setMockupUrl(null);
      setMockupLoading(false);
      setMockupAttempted(false);
      return;
    }

    let cancelled = false;
    setMockupUrl(null);
    setMockupLoading(true);
    setMockupAttempted(false);

    (async () => {
      try {
        const { mockupUrl: url } = await generateMockup({
          productId: product.id,
          variantId: selectedVariant.id,
          placement: selectedPlacement,
          imageUrl: artworkUrl,
        });

        if (!cancelled) {
          setMockupUrl(url);
        }
      } catch (e) {
        console.error("Mockup generation failed:", e);
      } finally {
        if (!cancelled) {
          setMockupLoading(false);
          setMockupAttempted(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artworkUrl, product?.id, selectedVariant?.id, selectedPlacement]);

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const colorCodes = variants.reduce<Record<string, string>>((acc, v) => {
    if (v.color && v.color_code) acc[v.color] = v.color_code;
    return acc;
  }, {});

  const displayPrice = selectedVariant
    ? getDisplayPrice(selectedVariant.price)
    : getDisplayPrice("15.00");

  function handleCustomize() {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    setPickerOpen(true);
  }

  async function loadMyArtworks() {
    if (!user) return;
    setLoadingArtworks(true);
    const { data } = await supabase
      .from("artworks")
      .select("id, generated_image_url, style, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setMyArtworks((data as Artwork[]) || []);
    setLoadingArtworks(false);
  }

  useEffect(() => {
    if (pickerOpen && user) loadMyArtworks();
  }, [pickerOpen, user]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("JPG or PNG only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("user_uploads").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("user_uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error("Couldn't get image URL");
      setArtworkUrl(signed.signedUrl);
      setPickerOpen(false);
      toast.success("Image ready - generating preview...");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleAddToOrder() {
    if (!selectedVariant || !artworkUrl) return;
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    const price = getMarkedUpPrice(selectedVariant.price);
    navigate("/checkout", {
      state: {
        orderItem: {
          variant_id: selectedVariant.id,
          variant_name: selectedVariant.name,
          product_title: product?.title,
          product_image: product?.image,
          size: selectedVariant.size,
          color: selectedVariant.color,
          placement: selectedPlacement,
          price,
          artwork_url: artworkUrl,
        },
      },
    });
  }

  if (loading || !product) {
    return (
      <PublicLayout>
        <div className="container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container py-10 md:py-14">
        <Button variant="ghost" asChild className="gap-2 mb-6 text-muted-foreground hover:text-foreground">
          <Link to="/gallery">
            <ArrowLeft className="h-4 w-4" /> Back to Gallery
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Preview */}
          <div className="space-y-4">
            <MockupPreview
              artworkUrl={artworkUrl || ""}
              productTitle={product.title}
              mockupUrl={mockupUrl}
              loading={mockupLoading}
              unavailable={mockupAttempted && !mockupUrl}
            />
            {!artworkUrl && (
              <p className="text-xs text-center text-muted-foreground">
                Add your pet art below to see it on this product.
              </p>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              {product.brand && (
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{product.brand}</p>
              )}
              <h1 className="font-heading text-3xl font-extrabold text-foreground">{product.title}</h1>
              <p className="text-3xl font-bold text-primary mt-2">{displayPrice}</p>
            </div>

            {/* +10 free treats promo */}
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Get 10 free treats with this purchase</p>
                <p className="text-xs text-muted-foreground">Auto-credited after checkout - use them to generate more pet art.</p>
              </div>
            </div>

            {placements.length > 1 && artworkUrl && (
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

            {/* CTA */}
            <div className="pt-2 space-y-3">
              {!artworkUrl ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full gap-2 text-base"
                  onClick={handleCustomize}
                >
                  <Sparkles className="h-4 w-4" /> Customize with your pet art
                </Button>
              ) : (
                <>
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full gap-2 text-base"
                    onClick={handleAddToOrder}
                    disabled={!selectedVariant}
                  >
                    <ShoppingCart className="h-4 w-4" /> Order this - {displayPrice}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setPickerOpen(true)}
                  >
                    Change artwork
                  </Button>
                </>
              )}
            </div>

            {product.description && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        <PeopleAlsoBought excludeId={product.id} />
      </div>

      {/* Artwork picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add your pet art</DialogTitle>
            <DialogDescription>
              Upload a new pet photo or pick from your previously generated artworks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Upload */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Upload a new photo</h3>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors flex flex-col items-center gap-2 text-muted-foreground"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
                <p className="text-sm">{uploading ? "Uploading..." : "Click to upload (JPG/PNG, 10MB max)"}</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Existing artworks */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Or pick from your generated art</h3>
              {loadingArtworks ? (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : myArtworks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No generated art yet.{" "}
                  <Link to="/create-art" className="text-primary hover:underline">
                    Create your first
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                  {myArtworks.map((a) =>
                    a.generated_image_url ? (
                      <button
                        key={a.id}
                        onClick={() => {
                          setArtworkUrl(a.generated_image_url);
                          setPickerOpen(false);
                        }}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all"
                      >
                        <img
                          src={a.generated_image_url}
                          alt={a.style}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth required prompt */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" /> Sign in to customize
            </DialogTitle>
            <DialogDescription>
              Create a free account to upload your pet's photo, generate art, and order custom merchandise.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="hero" className="w-full">
              <Link to="/signup" state={{ from: `/product/${productId}` }}>
                Create free account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login" state={{ from: `/product/${productId}` }}>
                I already have an account
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
};

export default ProductPage;
