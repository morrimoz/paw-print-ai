import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductImageGalleryProps {
  images: string[];
  /** Currently displayed main image (controlled). */
  selected: string;
  onSelect: (image: string) => void;
  /** Optional: when provided, renders a "+" tile that triggers another mockup generation. */
  onAddMore?: () => void;
  addMoreLoading?: boolean;
  /** Tooltip text shown when hovering the "+" tile. */
  addMoreHint?: string;
}

/**
 * Thumbnail strip rendered under the main product image. Lets the user
 * cycle through every distinct image we have for the active variant +
 * any generated mockup. Hides itself when there's only one image.
 */
export function ProductImageGallery({
  images,
  selected,
  onSelect,
  onAddMore,
  addMoreLoading,
  addMoreHint,
}: ProductImageGalleryProps) {
  // Dedupe while preserving order; never render an empty strip.
  const unique = Array.from(new Set(images.filter(Boolean)));
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  // Reset error tracking when the source list changes (e.g. variant change).
  useEffect(() => {
    setImgError({});
  }, [unique.join("|")]);

  const visible = unique.filter((src) => !imgError[src]);
  // Hide entirely only when there's nothing to show AND no add-more action.
  if (visible.length <= 1 && !onAddMore) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {visible.map((src) => {
          const isActive = src === selected;
          return (
            <button
              key={src}
              type="button"
              onClick={() => onSelect(src)}
              aria-label="View product image"
              aria-pressed={isActive}
              className={cn(
                "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 bg-muted/40",
                isActive
                  ? "border-primary ring-2 ring-primary/30 scale-[1.03]"
                  : "border-border hover:border-primary/50 opacity-80 hover:opacity-100",
              )}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="w-full h-full object-contain"
                onError={() => setImgError((prev) => ({ ...prev, [src]: true }))}
              />
            </button>
          );
        })}

        {onAddMore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAddMore}
                disabled={addMoreLoading}
                aria-label="Generate another mockup angle"
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed transition-all duration-200",
                  "flex items-center justify-center text-muted-foreground",
                  "border-border hover:border-primary hover:text-primary hover:bg-primary/5",
                  addMoreLoading && "opacity-60 cursor-wait",
                )}
              >
                {addMoreLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            {addMoreHint && (
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                {addMoreHint}
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
