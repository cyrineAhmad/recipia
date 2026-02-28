import { Recipe, RecipeStatus } from "@/types/recipe";
import StatusBadge from "./StatusBadge";
import { ShareRecipeDialog } from "./ShareRecipeDialog";
import { Clock, X, ArrowLeft, Heart, Bookmark, ChefHat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusButtons: { status: RecipeStatus; icon: typeof Heart; label: string }[] = [
  { status: "favorite", icon: Heart, label: "Favorite" },
  { status: "to_try", icon: Bookmark, label: "To Try" },
  { status: "made_before", icon: ChefHat, label: "Made Before" },
];

interface RecipeDetailsProps {
  recipe: Recipe;
  onClose: () => void;
  onStatusChange?: (id: string, status: RecipeStatus) => void;
  onRecipeUpdate?: (updated: Recipe) => void;
}

const RecipeDetails = ({ recipe, onClose, onStatusChange, onRecipeUpdate }: RecipeDetailsProps) => {
  const handleStatusClick = (status: RecipeStatus) => {
    if (recipe.status === status) {
      onStatusChange?.(recipe.id, status);
      onRecipeUpdate?.({ ...recipe, status: undefined });
    } else {
      onStatusChange?.(recipe.id, status);
      onRecipeUpdate?.({ ...recipe, status });
    }
  };

  return (
  <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="relative">
        <img src={recipe.image} alt={recipe.name} className="w-full h-64 object-cover rounded-t-2xl" />
        <button
          onClick={onClose}
          className="absolute top-4 left-4 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-card transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-card transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <StatusBadge status={recipe.status} size="md" />
          {onStatusChange && (
            <div className="flex gap-1">
              {statusButtons.map(({ status, icon: Icon, label }) => {
                const isSelected = recipe.status === status;
                return (
                  <Tooltip key={status}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={() => handleStatusClick(status)}
                        aria-label={`Mark as ${label}`}
                        aria-pressed={isSelected}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            status === "favorite" && isSelected ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
          <ShareRecipeDialog
            recipeId={recipe.id}
            recipeName={recipe.name}
          />
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {recipe.prepTimeMinutes} min
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{recipe.cuisineType}</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">{recipe.name}</h2>

        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-2">Ingredients</h3>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map((ing, i) => (
              <span key={i} className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                {ing}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-2">Instructions</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{recipe.instructions}</p>
        </div>
      </div>
    </div>
  </div>
);
};

export default RecipeDetails;
