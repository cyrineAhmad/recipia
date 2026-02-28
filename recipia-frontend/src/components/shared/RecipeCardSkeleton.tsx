import { Skeleton } from "@/components/ui/skeleton";

const RecipeCardSkeleton = () => {
  return (
    <div className="rounded-xl overflow-hidden bg-card shadow-sm border border-border">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-3" />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default RecipeCardSkeleton;
