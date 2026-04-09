import { PublicLayout } from "@/components/PublicLayout";
import { useState } from "react";

const styles = ["All", "Watercolor", "Pop Art", "Anime", "Oil Painting", "Sketch"];

const sampleArt = [
  { id: 1, src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop", style: "Watercolor", pet: "Golden Retriever" },
  { id: 2, src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop", style: "Pop Art", pet: "Tabby Cat" },
  { id: 3, src: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop", style: "Anime", pet: "Dogs at Play" },
  { id: 4, src: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop", style: "Oil Painting", pet: "Bulldog" },
  { id: 5, src: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop", style: "Sketch", pet: "Ginger Cat" },
  { id: 6, src: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&h=400&fit=crop", style: "Watercolor", pet: "Husky" },
];

const Gallery = () => {
  const [activeStyle, setActiveStyle] = useState("All");

  const filtered = activeStyle === "All" ? sampleArt : sampleArt.filter((a) => a.style === activeStyle);

  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-center text-foreground">
            Art Gallery
          </h1>
          <p className="mt-3 text-center text-muted-foreground">
            Browse stunning AI-generated pet art created by our community.
          </p>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {styles.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStyle(s)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeStyle === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((art) => (
              <div
                key={art.id}
                className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={art.src}
                    alt={`${art.style} art of ${art.pet}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-foreground">{art.pet}</h3>
                  <span className="text-xs text-primary font-medium">{art.style}</span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-12 text-center text-muted-foreground">No artwork found for this style yet.</p>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Gallery;
