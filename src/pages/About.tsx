import { PublicLayout } from "@/components/PublicLayout";
import { Heart, Lightbulb, Shield, Smile } from "lucide-react";

const values = [
  { icon: Heart, title: "Heartfelt", description: "We celebrate the bond between pets and their humans." },
  { icon: Smile, title: "Playful", description: "Art should be fun - we bring joy to every creation." },
  { icon: Shield, title: "Transparent", description: "Clear pricing, no hidden fees, your data stays yours." },
  { icon: Lightbulb, title: "Innovative", description: "Cutting-edge AI to deliver stunning, unique results." },
];

const About = () => {
  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            About PawPrint AI
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-center">
            We started PawPrint AI because we believe every pet deserves to be immortalized as a work of art.
            Traditional pet portraits are slow, expensive, and often generic. We're changing that with the
            power of AI - making personalized, high-quality pet art accessible to everyone.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-card rounded-xl p-6 shadow-card">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center mb-3">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              Have questions? <a href="/contact" className="text-primary hover:underline">Get in touch</a> - we'd love to hear from you.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default About;
