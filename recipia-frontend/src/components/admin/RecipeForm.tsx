/**
 * Admin-only: Create/edit recipes with image upload to Supabase Storage.
 * Only admins can add or edit recipes.
 */
import { useState } from "react";
import { Recipe } from "@/types/recipe";
import { api } from "@/lib/api";
import { uploadRecipeImage } from "@/lib/storage";
import { X, Sparkles, Wand2, Loader2, Upload } from "lucide-react";

interface RecipeFormProps {
  recipe?: Recipe;
  onSave: (recipe: Omit<Recipe, "id" | "status"> & { id?: string }) => void;
  onCancel: () => void;
}

const RecipeForm = ({ recipe, onSave, onCancel }: RecipeFormProps) => {
  const [name, setName] = useState(recipe?.name || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients.join(", ") || "");
  const [instructions, setInstructions] = useState(recipe?.instructions || "");
  const [cuisineType, setCuisineType] = useState(recipe?.cuisineType || "");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(recipe?.prepTimeMinutes || 0);
  const [image, setImage] = useState(recipe?.image || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that an image is uploaded
    if (!image || image.trim() === "") {
      setUploadError("Please upload an image for the recipe.");
      return;
    }
    
    onSave({
      ...(recipe?.id ? { id: recipe.id } : {}),
      name,
      ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean),
      instructions,
      cuisineType,
      prepTimeMinutes,
      image: image,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const url = await uploadRecipeImage(file);
      setImage(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const prompt =
        name.trim() ||
        (ingredients ? `A recipe using: ${ingredients}` : "A delicious recipe");
      const params: {
        prompt: string;
        cuisine_type?: string;
        prep_time_max?: number;
      } = { prompt };
      if (cuisineType) params.cuisine_type = cuisineType;
      if (prepTimeMinutes) params.prep_time_max = prepTimeMinutes;

      const result = await api.ai.generateRecipe(params);
      const generated = result.recipe;
      if (generated?.name) setName(generated.name);
      if (generated?.ingredients)
        setIngredients(generated.ingredients.join(", "));
      if (generated?.instructions)
        setInstructions(
          Array.isArray(generated.instructions)
            ? generated.instructions.join("\n")
            : generated.instructions,
        );
      if (generated?.cuisine_type) setCuisineType(generated.cuisine_type);
      if (generated?.prep_time_minutes)
        setPrepTimeMinutes(generated.prep_time_minutes);
      if (generated?.image_url) setImage(generated.image_url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprove = async () => {
    if (!instructions || !recipe?.id) return;
    setIsImproving(true);
    try {
      const result = await api.ai.improveRecipe(recipe.id, "detailed");
      const improved = result.improved_recipe;
      if (improved?.instructions) {
        setInstructions(
          Array.isArray(improved.instructions)
            ? improved.instructions.join("\n")
            : improved.instructions,
        );
      }
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{recipe ? "Edit Recipe" : "Add Recipe"}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate with AI
            </button>
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Recipe Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              placeholder="Enter recipe name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Cuisine Type</label>
              <input
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="e.g. Italian"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Prep Time (min)</label>
              <input
                type="number"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                min={1}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Image <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">Upload JPEG, PNG, WebP, or GIF (max 5MB). Required.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-input bg-muted/50 text-muted-foreground hover:bg-muted transition-colors cursor-pointer text-sm">
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Choose file"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {image && (
                <div className="flex items-center gap-2">
                  <img src={image} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{image}</span>
                </div>
              )}
              {!image && (
                <p className="text-xs text-destructive self-center">No image uploaded yet</p>
              )}
            </div>
            {uploadError && <p className="text-sm text-destructive mt-1">{uploadError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Ingredients (comma separated)</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder="Spaghetti, Eggs, Cheese..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">Instructions</label>
              <button
                type="button"
                onClick={handleImprove}
                disabled={isImproving || !instructions || !recipe?.id}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                {isImproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Improve with AI
              </button>
            </div>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder="Step-by-step instructions..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {recipe ? "Update Recipe" : "Add Recipe"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeForm;
