/**
 * Admin-only: Table view for managing recipes (edit, delete).
 * Only admins see this view.
 */
import { Recipe } from "@/types/recipe";
import { Pencil, Trash2 } from "lucide-react";

interface ManageRecipesTableProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

const ManageRecipesTable = ({ recipes, onEdit, onDelete }: ManageRecipesTableProps) => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="text-left font-medium text-muted-foreground p-4">Recipe</th>
          <th className="text-left font-medium text-muted-foreground p-4">Cuisine</th>
          <th className="text-left font-medium text-muted-foreground p-4">Prep Time</th>
          <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {recipes.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
            <td className="p-4">
              <div className="flex items-center gap-3">
                <img src={r.image} alt={r.name} className="h-10 w-10 rounded-lg object-cover" />
                <span className="font-medium text-foreground">{r.name}</span>
              </div>
            </td>
            <td className="p-4 text-muted-foreground">{r.cuisineType}</td>
            <td className="p-4 text-muted-foreground">{r.prepTimeMinutes} min</td>
            <td className="p-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onEdit(r)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(r.id)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {recipes.length === 0 && (
      <p className="text-center text-muted-foreground py-12">No recipes found.</p>
    )}
  </div>
);

export default ManageRecipesTable;
