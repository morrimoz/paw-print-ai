import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, Palette, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import howItWorksHero from "@/assets/how-it-works-hero.png";

const steps = [
  {
    icon: Upload,
    title: "1. Upload Your Pet's Photo",
    description: "Start by uploading a clear, well-lit photo of your pet. JPG or PNG, up to 10MB. The better the photo, the more stunning the result!",
  },
  {
    icon: Palette,
    title: "2. Choose Your Art Style",
    description: "Browse our collection of AI art styles — watercolor, pop art, anime, oil painting, and more. Each style brings a unique personality to your pet's portrait.",
  },
  {
    icon: Sparkles,
    title: "3. Watch the Magic Happen",
    description: "Our AI engine analyzes your photo and generates a one-of-a-kind artwork in seconds. Preview it instantly and download in high resolution.",
  },
  {
    icon: ShoppingBag,
    title: "4. Order Custom Merchandise",
    description: "Love your art? Print it on premium canvas prints, mugs, t-shirts, and more. Fulfilled and shipped directly to your door via our print partner.",
  },
];

const HowItWorks = () => {
  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            How It Works
          </h1>
          <p className="mt-4 text-center text-lg text-muted-foreground">
            From photo to masterpiece in minutes — no artistic skills needed.
          </p>

          <div className="mt-10">
            <img
              src={howItWorksHero}
              alt="How PawPrint AI works — upload, transform, print"
              className="rounded-xl shadow-card w-full"
              loading="eager"
            />
          </div>

          <div className="mt-16 flex flex-col gap-12">
            {steps.map((step) => (
              <div key={step.title} className="flex gap-6 items-start">
                <div className="flex-shrink-0 h-14 w-14 flex items-center justify-center rounded-full bg-accent">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">{step.title}</h2>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/create-art">Start Creating Your Art <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default HowItWorks;
