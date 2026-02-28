import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import SuggestionsManager from "@/components/admin/SuggestionsManager";
import { Plus, Sparkles, X, Users } from "lucide-react";
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
    image: apiRecipe.image_url || "",
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
  const [searchParams] = useSearchParams();
  const { profile, user, signOut } = useAuth();
  const userRole: UserRole = profile?.role === "admin" ? "admin" : "user";

  const queryClient = useQueryClient();

  const [activePage, setActivePage] = useState("recipes");
  
  // Handle page query parameter from notifications
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam === 'shared') {
      setActivePage('shared');
      // Clear the query parameter
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

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

  const { data: sharedRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ["sharedRecipes"],
    queryFn: async () => {
      const apiRecipes = await api.sharing.getSharedWithMe();
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
      
      // Call the success callback if it exists (from suggestion)
      const callback = (window as any).__suggestionSuccessCallback;
      if (callback && typeof callback === 'function') {
        await callback();
        delete (window as any).__suggestionSuccessCallback;
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

  const [ingredientsInput, setIngredientsInput] = useState("");
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

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

  const handleAddIngredient = () => {
    const trimmed = ingredientsInput.trim();
    if (trimmed && !ingredientsList.includes(trimmed)) {
      setIngredientsList([...ingredientsList, trimmed]);
      setIngredientsInput("");
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredientsList(ingredientsList.filter(i => i !== ingredient));
  };

  const handleGetAISuggestions = async () => {
    if (ingredientsList.length === 0) return;
    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const result = await api.ai.suggestByIngredients(ingredientsList);
      setAiSuggestions(result.suggested_recipes || []);
    } catch (error: any) {
      console.error("Error getting AI suggestions", error);
      setAiError(error?.message || "Failed to get AI suggestions. Please try again.");
    } finally {
      setIsGeneratingAI(false);
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
      : activePage === "shared"
      ? "Shared With Me"
      : activePage === "profile"
      ? "Profile"
      : activePage === "suggestions"
      ? "Recipe Suggestions"
      : activePage === "suggest"
      ? "Suggest a Recipe"
      : "Recipia";

  const handleAddSuggestionToRecipes = (suggestion: any, onSuccess: () => void) => {
    // Pre-populate form with suggestion data
    const suggestionAsRecipe: Recipe = {
      id: "",
      name: suggestion.title,
      ingredients: [], // Admin will need to add these
      instructions: suggestion.description, // Use description as starting point for instructions
      cuisineType: "",
      prepTimeMinutes: 0,
      image: "", // Admin must upload an image
    };
    setFormRecipe(suggestionAsRecipe);
    setShowForm(true);
    
    (window as any).__suggestionSuccessCallback = onSuccess;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar 
        userRole={userRole} 
        activePage={activePage} 
        onNavigate={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader 
          title={pageTitle} 
          userRole={userRole} 
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activePage === "shared" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {sharedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={setSelectedRecipe}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {sharedRecipes.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No recipes have been shared with you yet.</p>
                </div>
              )}
            </div>
          )}

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
                    className="sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
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

          {activePage === "suggestions" && userRole === "admin" && (
            <div className="max-w-6xl mx-auto">
              <SuggestionsManager onAddToRecipes={handleAddSuggestionToRecipes} />
            </div>
          )}

          {activePage === "suggest" && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manual Recipe Suggestion */}
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Share a Recipe</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Found a great recipe? Share it with the Recipia team. Admins will review and add it to the collection.
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
                      className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSubmittingSuggestion ? "Submitting..." : "Submit suggestion"}
                    </button>
                  </form>
                </div>

                {/* AI Recipe Suggestions by Ingredients */}
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">AI Recipe Ideas</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Have ingredients but not sure what to cook? Let AI suggest recipe ideas for you!
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Your ingredients</label>
                      <div className="flex gap-2">
                        <input
                          value={ingredientsInput}
                          onChange={(e) => setIngredientsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddIngredient();
                            }
                          }}
                          className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          placeholder="e.g. chicken, rice, tomatoes"
                        />
                        <button
                          type="button"
                          onClick={handleAddIngredient}
                          className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {ingredientsList.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ingredientsList.map((ingredient, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm"
                          >
                            {ingredient}
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(ingredient)}
                              className="hover:text-foreground transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGetAISuggestions}
                      disabled={ingredientsList.length === 0 || isGeneratingAI}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGeneratingAI ? "Generating ideas..." : "Get AI suggestions"}
                    </button>

                    {aiError && (
                      <p className="text-sm text-destructive">{aiError}</p>
                    )}

                    {aiSuggestions.length > 0 && (
                      <div className="pt-2">
                        <h3 className="text-sm font-medium text-foreground mb-2">Suggested recipes:</h3>
                        <ul className="space-y-2">
                          {aiSuggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              className="text-sm text-muted-foreground pl-3 border-l-2 border-accent"
                            >
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
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
