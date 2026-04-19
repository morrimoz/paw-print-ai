import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Tailwind classes applied to the wrapper holding both image and shimmer. */
  wrapperClassName?: string;
  /** Aspect ratio class for the placeholder so it has a known size before load. */
  aspectClassName?: string;
  /** Override placeholder rounding/look. Defaults to inherit from wrapper. */
  placeholderClassName?: string;
}

/**
 * Image with an animated gradient shimmer placeholder that fades into
 * the actual image on load. Useful for hero/large images.
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
    <div className={cn("relative overflow-hidden", aspectClassName, wrapperClassName)}>
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
        className={cn("img-fade-in relative z-10", loaded && "is-loaded", className)}
      />
    </div>
  );
}
