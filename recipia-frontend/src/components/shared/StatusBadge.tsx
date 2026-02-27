import { RecipeStatus } from "@/types/recipe";
import { Heart, Bookmark, ChefHat } from "lucide-react";

interface StatusBadgeProps {
  status?: RecipeStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<RecipeStatus, { label: string; icon: typeof Heart; bgClass: string; textClass: string }> = {
  favorite: { label: "Favorite", icon: Heart, bgClass: "bg-status-favorite-bg", textClass: "text-status-favorite" },
  to_try: { label: "To Try", icon: Bookmark, bgClass: "bg-status-to-try-bg", textClass: "text-status-to-try" },
  made_before: { label: "Made Before", icon: ChefHat, bgClass: "bg-status-made-before-bg", textClass: "text-status-made-before" },
};

const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  if (!status) return null;
  
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-3 py-1 gap-1.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses}`}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
