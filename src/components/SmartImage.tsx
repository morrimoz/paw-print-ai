import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Tailwind classes applied to the wrapper holding both image and shimmer. */
  wrapperClassName?: string;
  /** Aspect ratio class (e.g. `aspect-[4/3]`). Held BOTH while loading and
   *  after load so the placeholder and the final image occupy exactly the
   *  same box — no layout shift, no extra whitespace. Pass the real image
   *  ratio for a perfect match. */
  aspectClassName?: string;
  /** Override placeholder rounding/look. Defaults to inherit from wrapper. */
  placeholderClassName?: string;
}

/**
 * Image with an animated gradient shimmer placeholder that crossfades into
 * the actual image on load.
 *
 * The wrapper keeps a fixed aspect ratio so the shimmer and the final image
 * occupy the exact same space. The image is absolutely positioned and fades
 * in; the shimmer fades out. No layout shift, no trailing whitespace.
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
        aspectClassName,
        wrapperClassName,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 shimmer-loader transition-opacity duration-700 ease-out",
          loaded ? "opacity-0" : "opacity-100",
          placeholderClassName,
        )}
        aria-hidden="true"
      />
      <img
        {...imgProps}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}
