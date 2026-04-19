import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Tailwind classes applied to the wrapper holding both image and shimmer. */
  wrapperClassName?: string;
  /** Aspect ratio class used ONLY while the image is loading, so the shimmer
   *  has the same shape as the eventual image. Removed once loaded so the
   *  wrapper collapses to the natural image height (no extra whitespace). */
  aspectClassName?: string;
  /** Override placeholder rounding/look. Defaults to inherit from wrapper. */
  placeholderClassName?: string;
}

/**
 * Image with an animated gradient shimmer placeholder that fades into
 * the actual image on load.
 *
 * Sizing strategy: while loading, the wrapper enforces `aspectClassName` so
 * the shimmer reserves the right shape. Once the image is loaded, that
 * aspect class is dropped and the wrapper shrink-wraps the actual image,
 * preventing extra whitespace below it.
 */
export function SmartImage({
  wrapperClassName,
  aspectClassName,
  placeholderClassName,
  className,
  onLoad,
  ...imgProps
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !loaded && aspectClassName,
        wrapperClassName,
      )}
    >
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 shimmer-loader",
            placeholderClassName,
          )}
          aria-hidden="true"
        />
      )}
      <img
        {...imgProps}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "img-fade-in relative z-10 block",
          // While loading, fill the aspect-ratio box so the image renders into
          // the placeholder's space; once loaded, switch to natural sizing.
          !loaded ? "absolute inset-0 w-full h-full" : "w-full h-auto",
          loaded && "is-loaded",
          className,
        )}
      />
    </div>
  );
}
