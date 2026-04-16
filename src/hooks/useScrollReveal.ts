import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Animates direct-child elements with class `.reveal` (or any selector) into view
 * with a staggered fade + lift, triggered by ScrollTrigger.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  selector = ".reveal",
  opts: { y?: number; stagger?: number; start?: string } = {}
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      const targets = ref.current!.querySelectorAll<HTMLElement>(selector);
      if (!targets.length) return;
      gsap.set(targets, { opacity: 0, y: opts.y ?? 40 });
      targets.forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: opts.start ?? "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [selector, opts.y, opts.stagger, opts.start]);

  return ref;
}
