export type RecipeStatus = "favorite" | "to_try" | "made_before";
export type UserRole = "admin" | "user";

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  cuisineType: string;
  prepTimeMinutes: number;
  image: string;
  status?: RecipeStatus;
}
