from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.database import get_supabase
from app.models import Recipe, RecipeCreate, RecipeUpdate, StatusUpdate, User

router = APIRouter(prefix="/recipes", tags=["Recipes"])


@router.get("", response_model=List[Recipe])
async def get_recipes(
    search: Optional[str] = Query(None, description="Search by name or ingredient"),
    cuisine_type: Optional[str] = Query(None),
    prep_time_max: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get all recipes with optional filters for an authenticated user."""
    supabase = get_supabase()

    query = supabase.table("recipes").select("*")

    if search:
        term = search.strip()
        if term:
            query = query.or_(
                f"name.ilike.%{term}%,"
                f"cuisine_type.ilike.%{term}%,"
                f"ingredients.cs.{{{term}}},"
                f"instructions.cs.{{{term}}}"
            )

    if cuisine_type:
        query = query.eq("cuisine_type", cuisine_type)

    if prep_time_max:
        query = query.lte("prep_time_minutes", prep_time_max)

    response = query.order("created_at", desc=True).execute()
    recipes = response.data or []

    status_response = (
        supabase.table("user_recipe_status")
        .select("recipe_id, status")
        .eq("user_id", str(current_user.id))
        .execute()
    )

    status_map = {s["recipe_id"]: s["status"] for s in (status_response.data or [])}

    for recipe in recipes:
        recipe["status"] = status_map.get(recipe["id"])

    return recipes


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Get a single recipe by ID for an authenticated user."""
    supabase = get_supabase()

    response = (
        supabase.table("recipes")
        .select("*")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe = response.data

    status_response = (
        supabase.table("user_recipe_status")
        .select("status")
        .eq("user_id", str(current_user.id))
        .eq("recipe_id", str(recipe_id))
        .execute()
    )

    if status_response.data:
        recipe["status"] = status_response.data[0]["status"]

    return recipe


@router.post("", response_model=Recipe, status_code=201)
async def create_recipe(
    recipe_data: RecipeCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new recipe for the authenticated user."""
    supabase = get_supabase()

    recipe_dict = recipe_data.model_dump()
    recipe_dict["created_by"] = str(current_user.id)

    response = supabase.table("recipes").insert(recipe_dict).execute()

    return response.data[0]


@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: UUID,
    recipe_data: RecipeUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a recipe owned by the authenticated user (or admin)."""
    supabase = get_supabase()

    existing = (
        supabase.table("recipes")
        .select("created_by")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if existing.data["created_by"] != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = recipe_data.model_dump(exclude_unset=True)

    if update_data:
        response = (
            supabase.table("recipes")
            .update(update_data)
            .eq("id", str(recipe_id))
            .execute()
        )
        return response.data[0]

    return existing.data


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Delete a recipe owned by the authenticated user (or admin)."""
    supabase = get_supabase()

    existing = (
        supabase.table("recipes")
        .select("created_by")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if existing.data["created_by"] != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    supabase.table("recipes").delete().eq("id", str(recipe_id)).execute()

    return None


@router.post("/{recipe_id}/status")
async def update_recipe_status(
    recipe_id: UUID,
    status_data: StatusUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update user's status for a recipe (favorite, to_try, made_before)."""
    supabase = get_supabase()

    recipe = (
        supabase.table("recipes")
        .select("id")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not recipe.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    data = {
        "user_id": str(current_user.id),
        "recipe_id": str(recipe_id),
        "status": status_data.status,
    }

    supabase.table("user_recipe_status").upsert(
        data,
        on_conflict="user_id,recipe_id"
    ).execute()

    return {"message": "Status updated", "status": status_data.status}


@router.delete("/{recipe_id}/status", status_code=204)
async def remove_recipe_status(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Remove user's status for a recipe."""
    supabase = get_supabase()

    supabase.table("user_recipe_status").delete().eq(
        "user_id", str(current_user.id)
    ).eq("recipe_id", str(recipe_id)).execute()

    return None