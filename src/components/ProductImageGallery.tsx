import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  /** Currently displayed main image (controlled). */
  selected: string;
  onSelect: (image: string) => void;
}

/**
 * Thumbnail strip rendered under the main product image. Lets the user
 * cycle through every distinct image we have for the active variant +
 * any generated mockup. Hides itself when there's only one image.
 */
export function ProductImageGallery({ images, selected, onSelect }: ProductImageGalleryProps) {
  // Dedupe while preserving order; never render an empty strip.
  const unique = Array.from(new Set(images.filter(Boolean)));
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  // Reset error tracking when the source list changes (e.g. variant change).
  useEffect(() => {
    setImgError({});
  }, [unique.join("|")]);

  const visible = unique.filter((src) => !imgError[src]);
  if (visible.length <= 1) return null;

  return (
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
    </div>
  );
}
