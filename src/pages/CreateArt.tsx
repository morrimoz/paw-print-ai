import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const artStyles = [
  { id: "watercolor", name: "Watercolor", icon: Palette },
  { id: "pop-art", name: "Pop Art", icon: Zap },
  { id: "anime", name: "Anime", icon: Star },
  { id: "oil-painting", name: "Oil Painting", icon: Brush },
  { id: "sketch", name: "Sketch", icon: PenTool },
  { id: "comic", name: "Comic Book", icon: Layers },
];

import { Palette, Zap, Star, Brush, PenTool, Layers } from "lucide-react";

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
      if (dragCounter.current === 0) {
        setIsDraggingOver(false);
      }
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

    if ((profile?.credits_balance ?? 0) < 1) {
      toast.error("Insufficient treats. Purchase more to continue.");
      navigate("/my-credits");
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
          style: selectedStyle || "watercolor",
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
      {/* Full-page drag overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-primary bg-card/80">
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
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Pet preview" className="mx-auto max-h-64 rounded-lg object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-10 w-10" />
                <p className="text-sm">Click to upload or drag & drop anywhere on the page</p>
                <p className="text-xs">JPG or PNG, max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Text Prompt */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">2. Describe Your Vision (Optional)</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. My dog as a royal king wearing a crown, in a majestic castle setting..."
            className="w-full rounded-xl border-2 border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none min-h-[100px]"
          />
        </div>

        {/* Style Selection */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">3. Choose Your Art Style (Optional)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {artStyles.map((style) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                  className={`rounded-xl p-4 text-center transition-all border-2 ${
                    selectedStyle === style.id
                      ? "border-primary bg-accent shadow-card"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-1 text-primary" />
                  <span className="text-sm font-medium text-foreground">{style.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <div className="text-center">
          <Button
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-md hover:shadow-lg text-base font-semibold h-12 px-10"
            onClick={handleGenerate}
            disabled={!selectedFile || generating}
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
