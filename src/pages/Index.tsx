import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, Palette, ShoppingBag, Sparkles, Star, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import heroImage from "@/assets/hero-explain.jpg";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { icon: Upload, title: "Upload Photo", description: "Snap or upload your pet's best photo." },
  { icon: Palette, title: "Choose a Style", description: "Pick from watercolor, pop art, anime & more." },
  { icon: Sparkles, title: "Generate Art", description: "AI transforms your photo in seconds." },
  { icon: ShoppingBag, title: "Order Merch", description: "Print your art on mugs, canvases & tees." },
];

const testimonials = [
  { text: "PawPrint AI turned my dog's photo into a stunning piece of art I'll treasure forever!", author: "Sarah M." },
  {
    text: "The process was so easy, and the final portrait exceeded all my expectations. Highly recommend!",
    author: "James K.",
  },
  { text: "I love my cat's AI portrait! It captures her perfectly and looks amazing on my wall.", author: "Mia R." },
];

const Index = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const heroImgRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useScrollReveal<HTMLDivElement>(".reveal");
  const testimonialsRef = useScrollReveal<HTMLDivElement>(".reveal");
  const ctaRef = useScrollReveal<HTMLDivElement>(".reveal");

  // Cinematic scroll-driven hero parallax
  useEffect(() => {
    if (!heroRef.current || !heroImgRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(heroImgRef.current, {
        y: -120,
        scale: 0.92,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom center",
          scrub: true,
        },
      });
      // Mouse parallax/tilt
      const onMove = (e: MouseEvent) => {
        const rect = heroImgRef.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        gsap.to(heroImgRef.current, {
          rotateX: dy * -6,
          rotateY: dx * 8,
          duration: 0.6,
          ease: "power2.out",
          transformPerspective: 800,
        });
      };
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <PublicLayout>
      {/* HERO — animated grainy gradient, centered image above text, taller */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-aurora grain-overlay min-h-[92vh] flex items-center"
      >
        <div className="container relative z-10 py-20 md:py-28 flex flex-col items-center text-center gap-10">
          <div
            ref={heroImgRef}
            className="w-full max-w-md md:max-w-lg animate-float-soft"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative rounded-3xl overflow-hidden glass-card-strong p-2">
              <img
                src={heroImage}
                alt="Heartwarming Pixar-style pet and owner illustration"
                className="w-full h-auto rounded-2xl"
                loading="eager"
              />
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.05] tracking-tight">
              Your Pet, Reimagined
              <br />
              <span className="text-primary">with AI Magic</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Transform pet photos into unique art, effortlessly. Create cherished keepsakes in seconds.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/create-art">
                  Create Your Pet Art <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild className="glass-card border-border/60">
                <Link to="/gallery">Explore Gallery</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground flex items-center gap-1 justify-center">
              <Sparkles className="h-4 w-4 text-primary" /> 5 free generations when you sign up — no credit card
              required
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — scroll-reveal stagger */}
      <section ref={stepsRef} className="py-20 md:py-28 relative">
        <div className="container">
          <h2 className="reveal font-heading text-3xl md:text-4xl font-extrabold text-center text-foreground">
            How It Works
          </h2>
          <p className="reveal mt-3 text-center text-muted-foreground max-w-md mx-auto">
            Four simple steps to turn your pet into a masterpiece.
          </p>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.title}
                className="reveal glass-card rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section ref={testimonialsRef} className="py-20 md:py-28 relative bg-aurora grain-overlay">
        <div className="container relative z-10">
          <h2 className="reveal font-heading text-3xl md:text-4xl font-extrabold text-center text-foreground">
            Loved by Pet Parents
          </h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.author} className="reveal glass-card rounded-2xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-foreground italic">"{t.text}"</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section ref={ctaRef} className="py-20 md:py-28">
        <div className="container text-center">
          <h2 className="reveal font-heading text-3xl md:text-4xl font-extrabold text-foreground">
            Ready to Create Something Special?
          </h2>
          <p className="reveal mt-3 text-muted-foreground max-w-md mx-auto">
            Join thousands of happy pet parents who have transformed their photos into lasting art.
          </p>
          <div className="reveal mt-8">
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Index;
