import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Recipe } from "@/types/recipe";
import { api } from "@/lib/api";
import { Clock, ArrowLeft, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function mapApiRecipeToRecipe(apiRecipe: any): Recipe {
  return {
    id: apiRecipe.id,
    name: apiRecipe.name,
    ingredients: apiRecipe.ingredients || [],
    instructions: Array.isArray(apiRecipe.instructions)
      ? apiRecipe.instructions.join("\n")
      : apiRecipe.instructions || "",
    cuisineType: apiRecipe.cuisine_type || "",
    prepTimeMinutes: apiRecipe.prep_time_minutes ?? 0,
    image: apiRecipe.image_url || "",
    status: apiRecipe.status as any,
  };
}

export function PublicRecipe() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!linkId) {
        setError("Invalid link");
        setLoading(false);
        return;
      }

      try {
        const data = await api.sharing.getPublicRecipe(linkId);
        setRecipe(mapApiRecipeToRecipe(data));
      } catch (err: any) {
        setError(err.message || "Failed to load recipe");
        toast.error(err.message || "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [linkId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This recipe link may have expired or been removed."}
          </p>
          <Button onClick={() => navigate("/login")} variant="default">
            Go to Recipia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">Recipia</span>
        </div>
        <Button onClick={() => navigate("/login")} variant="outline" size="sm">
          Sign In
        </Button>
      </header>

      {/* Recipe Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-64 sm:h-80 object-cover"
          />

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {recipe.prepTimeMinutes} min
              </span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {recipe.cuisineType}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              {recipe.name}
            </h1>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Ingredients
              </h2>
              <div className="flex flex-wrap gap-2">
                {recipe.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="text-sm px-3 py-1.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Instructions
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {recipe.instructions}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                This recipe was shared via Recipia.{" "}
                <a
                  href="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </a>{" "}
                to create and share your own recipes!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
