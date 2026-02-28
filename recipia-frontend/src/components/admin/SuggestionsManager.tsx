import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Eye, Loader2 } from "lucide-react";

interface RecipeSuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface SuggestionsManagerProps {
  onAddToRecipes: (suggestion: RecipeSuggestion, onSuccess: () => void) => void;
}

const SuggestionsManager = ({ onAddToRecipes }: SuggestionsManagerProps) => {
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      // First, fetch all recipe suggestions
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("recipe_suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (suggestionsError) throw suggestionsError;

      // Then, fetch profiles for each user_id
      if (suggestionsData && suggestionsData.length > 0) {
        const userIds = [...new Set(suggestionsData.map((s: any) => s.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }

        // Create a map of user_id to profile
        const profilesMap = new Map(
          profilesData?.map((p: any) => [p.id, p]) || []
        );

        // Combine suggestions with profile data
        const formattedData = suggestionsData.map((item: any) => {
          const profile = profilesMap.get(item.user_id);
          return {
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            description: item.description,
            status: item.status,
            created_at: item.created_at,
            user_name: profile?.full_name || profile?.email || "Unknown User",
          };
        });

        setSuggestions(formattedData);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      if (status === "rejected") {
        // Delete rejected suggestions immediately
        const { error } = await supabase
          .from("recipe_suggestions")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Delete error:", error);
          alert(`Failed to delete suggestion: ${error.message}`);
          throw error;
        }

        console.log(`Successfully deleted suggestion ${id}`);
        // Remove from local state
        setSuggestions(suggestions.filter(s => s.id !== id));
      } else {
        // Update status for approved suggestions
        const { error } = await supabase
          .from("recipe_suggestions")
          .update({ status })
          .eq("id", id);

        if (error) {
          console.error("Update error:", error);
          alert(`Failed to update suggestion: ${error.message}`);
          throw error;
        }

        console.log(`Successfully updated suggestion ${id} to status: ${status}`);
        // Update local state
        setSuggestions(suggestions.map(s => 
          s.id === id ? { ...s, status } : s
        ));
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("recipe_suggestions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete suggestion error:", error);
        alert(`Failed to delete suggestion: ${error.message}`);
        throw error;
      }

      console.log(`Successfully deleted suggestion ${id} after adding to recipes`);
      // Remove from local state
      setSuggestions(suggestions.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No recipe suggestions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {suggestion.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Suggested by: <span className="font-medium">{suggestion.user_name}</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      suggestion.status
                    )}`}
                  >
                    {suggestion.status}
                  </span>
                </div>

                <p className="text-sm text-foreground leading-relaxed">
                  {suggestion.description}
                </p>

                <p className="text-xs text-muted-foreground">
                  Submitted: {new Date(suggestion.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setSelectedSuggestion(suggestion)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Details
              </button>

              {suggestion.status === "pending" && (
                <>
                  <button
                    onClick={() => updateStatus(suggestion.id, "approved")}
                    disabled={updatingId === suggestion.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    {updatingId === suggestion.id ? "Updating..." : "Approve"}
                  </button>

                  <button
                    onClick={() => updateStatus(suggestion.id, "rejected")}
                    disabled={updatingId === suggestion.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    {updatingId === suggestion.id ? "Deleting..." : "Reject & Delete"}
                  </button>
                </>
              )}

              {suggestion.status === "approved" && (
                <button
                  onClick={() => {
                    onAddToRecipes(suggestion, async () => {
                      // Delete the suggestion after it's been added to recipes
                      await deleteSuggestion(suggestion.id);
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add to Recipe Menu
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Suggestion Details</h2>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipe Title</h3>
                <p className="text-lg font-semibold text-foreground">{selectedSuggestion.title}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedSuggestion.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Suggested By</h3>
                  <p className="text-sm text-foreground">{selectedSuggestion.user_name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      selectedSuggestion.status
                    )}`}
                  >
                    {selectedSuggestion.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Submitted On</h3>
                <p className="text-sm text-foreground">
                  {new Date(selectedSuggestion.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border">
              {selectedSuggestion.status === "approved" && (
                <button
                  onClick={() => {
                    onAddToRecipes(selectedSuggestion, async () => {
                      // Delete the suggestion after it's been added to recipes
                      await deleteSuggestion(selectedSuggestion.id);
                      setSelectedSuggestion(null);
                    });
                  }}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Add to Recipe Menu
                </button>
              )}
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsManager;
