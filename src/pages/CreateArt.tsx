import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Sparkles, ImagePlus, Contrast, Film, Palette, Camera, Smile, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import styleBlackWhite from "@/assets/style-blackandwhite.webp";
import stylePixar from "@/assets/style-pixar.jpg";
import styleRenaissance from "@/assets/style-renaissance.webp";
import styleHyperrealistic from "@/assets/style-hyperrealistic.png";
import styleHumorous from "@/assets/style-humorous.webp";
import styleCartoon from "@/assets/style-cartoon.webp";
import { GeneratingOverlay } from "@/components/GeneratingOverlay";
import { BorderGlow } from "@/components/BorderGlow";

const artStyles = [
  { id: "dramatic-bw", name: "Dramatic B&W", image: styleBlackWhite, Icon: Contrast },
  { id: "pixar", name: "Pixar Movie", image: stylePixar, Icon: Film },
  { id: "hyperrealistic", name: "Hyperrealistic", image: styleHyperrealistic, Icon: Camera },
  { id: "renaissance-oil", name: "Renaissance Oil", image: styleRenaissance, Icon: Palette },
  { id: "humorous", name: "Humorous Scenes", image: styleHumorous, Icon: Smile },
  { id: "cartoon", name: "Cartoon", image: styleCartoon, Icon: Wand2 },
];

const CreateArt = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const processFile = useCallback((file: File) => {
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
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Full-page drag and drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDraggingOver(false);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDraggingOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [processFile]);

  const handleGenerate = async () => {
    if (!selectedFile || !user) return;

    if (!prompt.trim()) {
      toast.error("Please describe your vision before generating.");
      return;
    }

    if ((profile?.credits_balance ?? 0) < 1) {
      toast.error("Insufficient treats. Purchase more to continue.");
      navigate("/my-treats");
      return;
    }

    setGenerating(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("user_uploads")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from("user_uploads")
        .createSignedUrl(filePath, 60 * 60);

      const originalUrl = signedData?.signedUrl;
      if (!originalUrl) throw new Error("Failed to get signed URL");

      const { data, error } = await supabase.functions.invoke("generate-art", {
        body: {
          original_image_url: originalUrl,
          style: selectedStyle || "auto",
          prompt: prompt || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Art generated successfully!");
      await refreshProfile();
      navigate("/artwork-preview", { state: { artwork: data.artwork } });
    } catch (err: any) {
      toast.error(err.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      {/* ASMR generating overlay - hides everything else while AI works */}
      {generating && <GeneratingOverlay sourceUrl={previewUrl} />}

      {/* Full-page drag overlay */}
      {isDraggingOver && !generating && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-primary glass-card-strong">
            <ImagePlus className="h-16 w-16 text-primary" />
            <p className="text-xl font-heading font-bold text-foreground">Drop your pet's photo here</p>
            <p className="text-sm text-muted-foreground">JPG or PNG, max 10MB</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-foreground">Create Art</h1>
          <span className="bg-accent text-accent-foreground text-sm font-medium px-3 py-1 rounded-full">
            {profile?.credits_balance ?? 0} treats remaining
          </span>
        </div>

        {/* Upload */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">1. Upload Your Pet's Photo</h2>
          <div
            className="relative border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              // Don't reopen the file picker when the user is interacting with
              // the preview (e.g. clicking the delete button).
              if (!previewUrl) fileRef.current?.click();
            }}
          >
            {previewUrl ? (
              <div className="relative inline-block mx-auto">
                <img src={previewUrl} alt="Pet preview" className="mx-auto max-h-64 rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label="Remove uploaded image"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-foreground text-background shadow-md flex items-center justify-center hover:bg-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-10 w-10" />
                <p className="text-sm">Click to upload or drag & drop anywhere on the page</p>
                <p className="text-xs">JPG or PNG, max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
          </div>
          {previewUrl && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Replace with a different photo
            </button>
          )}
        </div>

        {/* Text Prompt */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
            2. Describe Your Vision <span className="text-destructive">*</span>
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. My dog as a royal king wearing a crown, in a majestic castle setting..."
            required
            className="w-full rounded-xl border-2 border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none min-h-[100px]"
          />
          <p className="mt-2 text-xs text-muted-foreground">Tell us the scene - this drives what your pet is doing in the artwork.</p>
        </div>

        {/* Style Selection - image default, gradient+icon on hover */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">3. Choose Your Art Style (Optional)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {artStyles.map((style) => {
              const isSelected = selectedStyle === style.id;
              const hasSelection = selectedStyle !== null;
              const isDimmed = hasSelection && !isSelected;
              const Icon = style.Icon;
              return (
                <BorderGlow
                  key={style.id}
                  borderRadius={12}
                  glowRadius={28}
                  innerClassName="rounded-xl"
                >
                  <button
                    onClick={() => setSelectedStyle(isSelected ? null : style.id)}
                    style={{
                      boxShadow: isSelected
                        ? "0 0 0 3px hsl(var(--primary) / 0.35), 0 0 28px 4px hsl(var(--primary) / 0.45)"
                        : undefined,
                    }}
                    className={`group relative aspect-[4/3] w-full rounded-xl overflow-hidden border-2 transition-all duration-500 ease-out will-change-transform ${
                      isSelected
                        ? "border-primary scale-[1.04] z-10"
                        : isDimmed
                          ? "border-border scale-[0.92] opacity-50 md:hover:opacity-80"
                          : "border-border md:hover:border-primary/50 card-lift"
                    }`}
                  >
                    {/* Default state - the style reference image */}
                    <img
                      src={style.image}
                      alt={style.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                        isSelected
                          ? "opacity-100 scale-100"
                          : "opacity-100 scale-100 md:group-hover:opacity-0 md:group-hover:scale-105"
                      }`}
                      loading="lazy"
                    />

                    {/* Hover state - grainy gradient mesh + icon (hidden when selected, desktop only) */}
                    <div
                      className={`absolute inset-0 bg-mesh-card transition-opacity duration-500 ${
                        isSelected ? "opacity-0" : "opacity-0 md:group-hover:opacity-100"
                      }`}
                    >
                      <div className="absolute inset-0 grain-overlay" />
                      <div className="relative z-10 h-full flex items-center justify-center">
                        <Icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Bottom gradient for label readability over image */}
                    <div
                      className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 ${
                        isSelected ? "opacity-100" : "opacity-100 md:group-hover:opacity-0"
                      }`}
                    />

                    {/* Label */}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center p-3">
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isSelected
                            ? "text-white drop-shadow-md"
                            : "text-white drop-shadow-md md:group-hover:text-foreground md:group-hover:drop-shadow-none"
                        }`}
                      >
                        {style.name}
                      </span>
                    </div>
                  </button>
                </BorderGlow>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <div className="text-center">
          <Button
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-md hover:shadow-lg text-base font-semibold h-12 px-10"
            onClick={handleGenerate}
            disabled={!selectedFile || !prompt.trim() || generating}
          >
            {generating ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate
              </>
            )}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Costs 1 treat</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateArt;
