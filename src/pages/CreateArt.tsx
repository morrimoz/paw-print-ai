import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Upload, Sparkles, Image } from "lucide-react";
import { toast } from "sonner";

const artStyles = [
  { id: "watercolor", name: "Watercolor", preview: "🎨" },
  { id: "pop-art", name: "Pop Art", preview: "🌈" },
  { id: "anime", name: "Anime", preview: "✨" },
  { id: "oil-painting", name: "Oil Painting", preview: "🖼️" },
  { id: "sketch", name: "Sketch", preview: "✏️" },
  { id: "comic", name: "Comic Book", preview: "💥" },
];

const CreateArt = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const credits = 5;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Please upload a JPG or PNG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleGenerate = () => {
    if (!selectedFile || !selectedStyle) {
      toast.error("Please upload a photo and select a style.");
      return;
    }
    if (credits < 1) {
      toast.error("Insufficient credits. Purchase more to continue.");
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast.success("Art generated! (Demo mode — connect backend for real AI generation)");
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-foreground">Create Art</h1>
          <span className="bg-accent text-accent-foreground text-sm font-medium px-3 py-1 rounded-full">
            {credits} credits remaining
          </span>
        </div>

        {/* Upload */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">1. Upload Your Pet's Photo</h2>
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Pet preview" className="mx-auto max-h-64 rounded-lg object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-10 w-10" />
                <p className="text-sm">Click to upload or drag & drop</p>
                <p className="text-xs">JPG or PNG, max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Style Selection */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">2. Choose Your Art Style</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {artStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`rounded-xl p-4 text-center transition-all border-2 ${
                  selectedStyle === style.id
                    ? "border-primary bg-accent shadow-card"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="text-2xl block mb-1">{style.preview}</span>
                <span className="text-sm font-medium text-foreground">{style.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <div className="text-center">
          <Button
            variant="hero"
            size="xl"
            onClick={handleGenerate}
            disabled={!selectedFile || !selectedStyle || generating}
          >
            {generating ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate My Art (1 credit)
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateArt;
