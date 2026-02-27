import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Recipe, RecipeStatus, UserRole } from "@/types/recipe";
import AppSidebar from "@/components/shared/AppSidebar";
import AppHeader from "@/components/shared/AppHeader";
import RecipeCard from "@/components/shared/RecipeCard";
import RecipeDetails from "@/components/shared/RecipeDetails";
import SearchBar from "@/components/shared/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import ChatAssistant from "@/components/shared/ChatAssistant";
import RecipeForm from "@/components/admin/RecipeForm";
import ManageRecipesTable from "@/components/admin/ManageRecipesTable";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

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
    image: apiRecipe.image_url || "/images/pasta-carbonara.jpg",
    status: apiRecipe.status as RecipeStatus | undefined,
  };
}

function mapRecipeToApiPayload(recipe: Omit<Recipe, "id" | "status">) {
  return {
    name: recipe.name,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    cuisine_type: recipe.cuisineType,
    prep_time_minutes: recipe.prepTimeMinutes,
    image_url: recipe.image,
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const userRole: UserRole = profile?.role === "admin" ? "admin" : "user";

  const queryClient = useQueryClient();

  const [activePage, setActivePage] = useState("recipes");
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [prepTimeFilter, setPrepTimeFilter] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const prepTimeMax = useMemo(() => {
    if (!prepTimeFilter) return undefined;
    const [_, max] = prepTimeFilter.split("-").map(Number);
    return max;
  }, [prepTimeFilter]);

  const { data: recipes = [], isLoading, isError } = useQuery<Recipe[]>({
    queryKey: ["recipes", search, cuisineFilter, prepTimeMax],
    queryFn: async () => {
      const params: { search?: string; cuisine_type?: string; prep_time_max?: number } = {};
      if (search.trim()) params.search = search.trim();
      if (cuisineFilter) params.cuisine_type = cuisineFilter;
      if (prepTimeMax != null) params.prep_time_max = prepTimeMax;
      const apiRecipes = await api.recipes.getAll(params);
      return apiRecipes.map(mapApiRecipeToRecipe);
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (data: Omit<Recipe, "id" | "status">) => {
      const payload = mapRecipeToApiPayload(data);
      const created = await api.recipes.create(payload as any);
      return mapApiRecipeToRecipe(created);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async (data: Omit<Recipe, "id" | "status"> & { id: string }) => {
      const { id, ...rest } = data;
      const payload = mapRecipeToApiPayload(rest);
      const updated = await api.recipes.update(id, payload as any);
      return mapApiRecipeToRecipe(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.recipes.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecipeStatus }) => {
      await api.recipes.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const removeStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.recipes.removeStatus(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.cuisineType && set.add(r.cuisineType));
    return Array.from(set).sort();
  }, [recipes]);

  const handleStatusChange = (id: string, status: RecipeStatus) => {
    const currentRecipe = recipes.find(r => r.id === id);
    if (currentRecipe?.status === status) {
      removeStatusMutation.mutate(id);
    } else {
      updateStatusMutation.mutate({ id, status });
    }
  };

  const handleSave = async (data: Omit<Recipe, "id" | "status"> & { id?: string }) => {
    const isEdit = Boolean(data.id);
    try {
      if (isEdit) {
        await updateRecipeMutation.mutateAsync({
          id: data.id!,
          name: data.name,
          ingredients: data.ingredients,
          instructions: data.instructions,
          cuisineType: data.cuisineType,
          prepTimeMinutes: data.prepTimeMinutes,
          image: data.image,
        });
      } else {
        await createRecipeMutation.mutateAsync(data);
      }
    } catch (err) {
      console.error("Failed to save recipe:", err);
      return;
    }
    setShowForm(false);
    setFormRecipe(undefined);
  };

  const handleDelete = (id: string) => {
    deleteRecipeMutation.mutate(id);
  };

  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDescription, setSuggestDescription] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestTitle.trim() || !suggestDescription.trim() || !user) return;
    setIsSubmittingSuggestion(true);
    setSuggestionMessage(null);
    try {
      await supabase.from("recipe_suggestions").insert({
        user_id: user.id,
        title: suggestTitle.trim(),
        description: suggestDescription.trim(),
      });
      setSuggestTitle("");
      setSuggestDescription("");
      setSuggestionMessage("Thank you! Your suggestion has been submitted.");
    } catch (error) {
      console.error("Error submitting suggestion", error);
      setSuggestionMessage("Could not submit your suggestion. Please try again.");
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const pageTitle =
    activePage === "manage"
      ? "Manage Recipes"
      : activePage === "recipes"
      ? "Browse Recipes"
      : activePage === "profile"
      ? "Profile"
      : activePage === "suggest"
      ? "Suggest a Recipe"
      : "Recipia";

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userRole={userRole} activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title={pageTitle} userRole={userRole} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          {(activePage === "recipes" || activePage === "manage") && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-64">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search name, cuisine, ingredients..." />
                  </div>
                  {userRole === "admin" && activePage === "manage" && (
                  <button
                    onClick={() => { setFormRecipe(undefined); setShowForm(true); }}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Add Recipe
                  </button>
                )}
                </div>
                <FilterPanel
                  cuisines={cuisines}
                  selectedCuisine={cuisineFilter}
                  onCuisineChange={setCuisineFilter}
                  selectedPrepTime={prepTimeFilter}
                  onPrepTimeChange={setPrepTimeFilter}
                />
              </div>

              {activePage === "manage" && userRole === "admin" ? (
                <ManageRecipesTable
                  recipes={recipes}
                  onEdit={(r) => { setFormRecipe(r); setShowForm(true); }}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={setSelectedRecipe}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                  {recipes.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-12">No recipes found.</p>
                  )}
                </div>
              )}
            </>
          )}

          {activePage === "profile" && (
            <div className="max-w-md">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mb-4">
                  {userRole === "admin" ? "A" : "U"}
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {profile?.full_name || (userRole === "admin" ? "Admin User" : "User")}
                </h2>
                {user?.email && (
                  <p className="text-sm text-muted-foreground mb-1">
                    {user.email}
                  </p>
                )}
                {userRole === "admin" && (
                  <p className="text-xs text-muted-foreground mt-2">Admin account with full recipe management access.</p>
                )}
              </div>
            </div>
          )}

          {activePage === "suggest" && (
            <div className="max-w-xl">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Suggest a New Recipe</h2>
                <p className="text-sm text-muted-foreground">
                  Found a great recipe? Share it with the Recipia team. Admins can review and add it to the main
                  recipes.
                </p>
                <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Recipe title</label>
                    <input
                      value={suggestTitle}
                      onChange={(e) => setSuggestTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="e.g. Spicy Garlic Butter Shrimp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Why is it good?</label>
                    <textarea
                      value={suggestDescription}
                      onChange={(e) => setSuggestDescription(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                      placeholder="Share the link, key ingredients, or what makes it special..."
                    />
                  </div>
                  {suggestionMessage && (
                    <p className="text-sm text-muted-foreground">{suggestionMessage}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingSuggestion}
                    className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingSuggestion ? "Submitting..." : "Submit suggestion"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedRecipe && (
        <RecipeDetails
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onStatusChange={handleStatusChange}
          onRecipeUpdate={setSelectedRecipe}
        />
      )}
      {showForm && <RecipeForm recipe={formRecipe} onSave={handleSave} onCancel={() => { setShowForm(false); setFormRecipe(undefined); }} />}
      <ChatAssistant />
    </div>
  );
};

export default Index;
