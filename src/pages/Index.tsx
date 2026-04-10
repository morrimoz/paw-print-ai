import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, Palette, ShoppingBag, Sparkles, Star, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-pets.png";

const steps = [
  { icon: Upload, title: "Upload Photo", description: "Snap or upload your pet's best photo." },
  { icon: Palette, title: "Choose a Style", description: "Pick from watercolor, pop art, anime & more." },
  { icon: Sparkles, title: "Generate Art", description: "AI transforms your photo in seconds." },
  { icon: ShoppingBag, title: "Order Merch", description: "Print your art on mugs, canvases & tees." },
];

const testimonials = [
  { text: "PawPrint AI turned my dog's photo into a stunning piece of art I'll treasure forever!", author: "Sarah M." },
  { text: "The process was so easy, and the final portrait exceeded all my expectations. Highly recommend!", author: "James K." },
  { text: "I love my cat's AI portrait! It captures her perfectly and looks amazing on my wall.", author: "Mia R." },
];

const Index = () => {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-accent">
        <div className="container py-16 md:py-24 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
              Your Pet, Reimagined<br />
              <span className="text-primary">with AI Magic</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Transform pet photos into unique art, effortlessly. Create cherished keepsakes in seconds.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button variant="hero" size="xl" asChild>
                <Link to="/create-art">Create Your Pet Art <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/gallery">Explore Gallery</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ✨ 5 free generations when you sign up — no credit card required
            </p>
          </div>
          <div className="flex-1 max-w-lg">
            <img
              src={heroImage}
              alt="AI-generated pet art showcase"
              className="rounded-xl shadow-card w-full"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-center text-foreground">
            How It Works
          </h2>
          <p className="mt-3 text-center text-muted-foreground max-w-md mx-auto">
            Four simple steps to turn your pet into a masterpiece.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="bg-card rounded-xl p-6 shadow-card text-center hover:shadow-card-hover transition-shadow"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-accent">
        <div className="container">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-center text-foreground">
            Loved by Pet Parents
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.author} className="bg-card rounded-xl p-6 shadow-card">
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

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="container text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground">
            Ready to Create Something Special?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Join thousands of happy pet parents who have transformed their photos into lasting art.
          </p>
          <Button variant="hero" size="xl" className="mt-8" asChild>
            <Link to="/signup">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Index;
