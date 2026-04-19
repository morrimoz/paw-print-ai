import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface GeneratingOverlayProps {
  /** The user's source pet photo, shown as the image being transformed. */
  sourceUrl: string | null;
}

const ASMR_MESSAGES = [
  "Studying your pet's expression…",
  "Mixing the perfect palette…",
  "Painting fine details…",
  "Adding a touch of magic…",
  "Polishing the final masterpiece…",
];

/**
 * Full-screen ASMR overlay shown while AI art is generating. Hides the rest of
 * the form, enlarges the source image, and runs slow soothing animations
 * (pulse rings, breathing, orbiting sparkles, rotating status lines).
 */
export function GeneratingOverlay({ sourceUrl }: GeneratingOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % ASMR_MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-6">
      {/* Subtle aurora behind everything */}
      <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 grain-overlay pointer-events-none" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md text-center">
        {/* Pulse rings + breathing image */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-primary/15 pulse-ring" style={{ animationDelay: "0.9s" }} />
          <div className="absolute inset-0 rounded-full bg-primary/10 pulse-ring" style={{ animationDelay: "1.8s" }} />

          <div className="relative w-60 h-60 sm:w-64 sm:h-64 rounded-full overflow-hidden glass-card-strong ring-2 ring-primary/40 animate-breathe">
            {sourceUrl ? (
              <img src={sourceUrl} alt="Your pet" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-mesh-card" />
            )}
            {/* Soft animated sheen */}
            <div className="absolute inset-0 shimmer-loader opacity-20 mix-blend-overlay pointer-events-none" />
          </div>

          {/* Orbiting sparkle */}
          <div className="absolute inset-0 animate-orbit pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
            Conjuring your art
          </h2>
          <p className="text-sm text-muted-foreground min-h-[1.5rem] transition-opacity duration-500" key={msgIndex}>
            {ASMR_MESSAGES[msgIndex]}
          </p>
          <p className="text-xs text-muted-foreground/70">This usually takes about 20-40 seconds.</p>
        </div>
      </div>
    </div>
  );
}
