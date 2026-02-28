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

export interface RecipeShare {
  id: string;
  recipe_id: string;
  shared_by: string;
  shared_with: string;
  permission: "view" | "edit";
  created_at: string;
}

export interface RecipeShareWithUser {
  id: string;
  shared_with_email: string;
  shared_with_name?: string;
  permission: "view" | "edit";
  created_at: string;
}

export interface PublicLink {
  id: string;
  recipe_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "recipe_shared" | "recipe_updated" | "recipe_deleted";
  title: string;
  message: string;
  recipe_id?: string;
  shared_by?: string;
  is_read: boolean;
  created_at: string;
}
