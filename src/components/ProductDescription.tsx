interface ProductDescriptionProps {
  description: string;
}

/**
 * Printful product descriptions arrive as one long string with bullet
 * markers ("•") inlined. We split the leading paragraph from the bullet
 * list and render bullets as a proper <ul> for readability.
 */
export function ProductDescription({ description }: ProductDescriptionProps) {
  // Normalize various bullet markers to the same separator before splitting.
  const normalized = description.replace(/[●◦▪·]/g, "•");
  const firstBullet = normalized.indexOf("•");

  const intro = (firstBullet === -1 ? normalized : normalized.slice(0, firstBullet)).trim();

  const bullets =
    firstBullet === -1
      ? []
      : normalized
          .slice(firstBullet + 1)
          .split("•")
          .map((b) => b.trim())
          .filter(Boolean);

  return (
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      {intro && <p>{intro}</p>}
      {bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1.5 marker:text-primary/70">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
