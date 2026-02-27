import { Recipe, RecipeStatus } from "@/types/recipe";
import StatusBadge from "./StatusBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, ArrowRight, Heart, Bookmark, ChefHat } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onStatusChange?: (id: string, status: RecipeStatus) => void;
}

const statusButtons: { status: RecipeStatus; icon: typeof Heart; label: string }[] = [
  { status: "favorite", icon: Heart, label: "Favorite" },
  { status: "to_try", icon: Bookmark, label: "To Try" },
  { status: "made_before", icon: ChefHat, label: "Made Before" },
];

const RecipeCard = ({ recipe, onClick, onStatusChange }: RecipeCardProps) => {
  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(recipe)}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {onStatusChange && (
          <div className="absolute top-3 left-3">
            <StatusBadge status={recipe.status} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <span className="font-semibold uppercase tracking-wide">{recipe.cuisineType}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.prepTimeMinutes} min
          </span>
        </div>
        <h3 className="font-semibold text-card-foreground leading-snug mb-3">{recipe.name}</h3>
        <div className="flex items-center justify-between">
          <div
            className="flex gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Recipe status"
          >
            {onStatusChange &&
              statusButtons.map(({ status, icon: Icon, label }) => {
                const isSelected = recipe.status === status;
                return (
                  <Tooltip key={status}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 select-none touch-manipulation ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onStatusChange(recipe.id, status);
                        }}
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
          <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
