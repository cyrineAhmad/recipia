from uuid import UUID
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from app.auth import get_current_user, get_optional_user
from app.database import get_supabase
from app.models import (
    RecipeShareCreate, RecipeShare, PublicLinkCreate, PublicLink,
    Recipe, User
)

router = APIRouter(prefix="/sharing", tags=["Sharing"])


@router.post("/recipes/{recipe_id}/share", response_model=RecipeShare, status_code=201)
async def share_recipe(
    recipe_id: UUID,
    share_data: RecipeShareCreate,
    current_user: User = Depends(get_current_user),
):
    """Share a recipe with another user by email. Any authenticated user can share any recipe."""
    supabase = get_supabase()

    # Verify the recipe exists
    recipe_response = (
        supabase.table("recipes")
        .select("id")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not recipe_response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Find the user to share with by email
    recipient_response = (
        supabase.table("profiles")
        .select("id")
        .eq("email", share_data.shared_with_email)
        .single()
        .execute()
    )

    if not recipient_response.data:
        raise HTTPException(status_code=404, detail=f"User with email {share_data.shared_with_email} not found")

    recipient_id = recipient_response.data["id"]

    # Check if user is trying to share with themselves
    if recipient_id == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot share recipe with yourself")

    # Check if already shared
    existing_share = (
        supabase.table("recipe_shares")
        .select("id")
        .eq("recipe_id", str(recipe_id))
        .eq("shared_with", recipient_id)
        .execute()
    )

    if existing_share.data:
        raise HTTPException(status_code=400, detail="Recipe already shared with this user")

    # Create the share
    share_dict = {
        "recipe_id": str(recipe_id),
        "shared_by": str(current_user.id),
        "shared_with": recipient_id,
        "permission": share_data.permission,
    }

    try:
        response = supabase.table("recipe_shares").insert(share_dict).execute()
        return response.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recipes/shared-with-me", response_model=List[Recipe])
async def get_shared_recipes(
    current_user: User = Depends(get_current_user),
):
    """Get all recipes shared with the current user."""
    supabase = get_supabase()

    # Get all shares for the current user
    shares_response = (
        supabase.table("recipe_shares")
        .select("recipe_id")
        .eq("shared_with", str(current_user.id))
        .execute()
    )

    if not shares_response.data:
        return []

    recipe_ids = [share["recipe_id"] for share in shares_response.data]

    # Get the recipes
    recipes_response = (
        supabase.table("recipes")
        .select("*")
        .in_("id", recipe_ids)
        .order("created_at", desc=True)
        .execute()
    )

    recipes = recipes_response.data or []

    # Get user's status for these recipes
    status_response = (
        supabase.table("user_recipe_status")
        .select("recipe_id, status")
        .eq("user_id", str(current_user.id))
        .in_("recipe_id", recipe_ids)
        .execute()
    )

    status_map = {s["recipe_id"]: s["status"] for s in (status_response.data or [])}

    for recipe in recipes:
        recipe["status"] = status_map.get(recipe["id"])

    return recipes


@router.delete("/recipes/{recipe_id}/share/{share_id}", status_code=204)
async def remove_share(
    recipe_id: UUID,
    share_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Remove a recipe share. Only the user who created the share can delete it."""
    supabase = get_supabase()

    # Verify the share exists and user created it
    share_response = (
        supabase.table("recipe_shares")
        .select("shared_by, recipe_id")
        .eq("id", str(share_id))
        .single()
        .execute()
    )

    if not share_response.data:
        raise HTTPException(status_code=404, detail="Share not found")

    if share_response.data["shared_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only remove shares you created")

    if share_response.data["recipe_id"] != str(recipe_id):
        raise HTTPException(status_code=400, detail="Share does not belong to this recipe")

    supabase.table("recipe_shares").delete().eq("id", str(share_id)).execute()

    return None


@router.get("/recipes/{recipe_id}/shares", response_model=List[dict])
async def get_recipe_shares(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Get all shares for a specific recipe that the current user created."""
    supabase = get_supabase()

    # Verify the recipe exists
    recipe_response = (
        supabase.table("recipes")
        .select("id")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not recipe_response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Get shares created by the current user for this recipe
    shares_response = (
        supabase.table("recipe_shares")
        .select("id, shared_with, permission, created_at")
        .eq("recipe_id", str(recipe_id))
        .eq("shared_by", str(current_user.id))
        .execute()
    )

    shares = shares_response.data or []

    # Get user info for each share
    result = []
    for share in shares:
        user_response = (
            supabase.table("profiles")
            .select("email, full_name")
            .eq("id", share["shared_with"])
            .single()
            .execute()
        )
        
        if user_response.data:
            result.append({
                "id": share["id"],
                "shared_with_email": user_response.data["email"],
                "shared_with_name": user_response.data.get("full_name"),
                "permission": share["permission"],
                "created_at": share["created_at"],
            })

    return result


# ============= Public Link Routes =============


@router.post("/recipes/{recipe_id}/public-link", response_model=PublicLink, status_code=201)
async def create_public_link(
    recipe_id: UUID,
    link_data: Optional[PublicLinkCreate] = None,
    current_user: User = Depends(get_current_user),
):
    """Create or get existing public link for a recipe. Any authenticated user can create a public link."""
    supabase = get_supabase()

    # Verify the recipe exists
    recipe_response = (
        supabase.table("recipes")
        .select("id")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not recipe_response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Check if link already exists
    existing_link = (
        supabase.table("public_recipe_links")
        .select("*")
        .eq("recipe_id", str(recipe_id))
        .execute()
    )

    if existing_link.data:
        return existing_link.data[0]

    # Create new public link
    link_dict = {
        "recipe_id": str(recipe_id),
        "created_by": str(current_user.id),
        "is_active": True,
    }

    if link_data and link_data.expires_at:
        link_dict["expires_at"] = link_data.expires_at.isoformat()

    try:
        response = supabase.table("public_recipe_links").insert(link_dict).execute()
        return response.data[0]
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recipes/public/{link_id}", response_model=Recipe)
async def get_public_recipe(
    link_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get a recipe via public link (no authentication required)."""
    supabase = get_supabase()

    # Get the public link
    link_response = (
        supabase.table("public_recipe_links")
        .select("recipe_id, is_active, expires_at")
        .eq("id", str(link_id))
        .single()
        .execute()
    )

    if not link_response.data:
        raise HTTPException(status_code=404, detail="Public link not found")

    link = link_response.data

    # Check if link is active
    if not link["is_active"]:
        raise HTTPException(status_code=403, detail="This link has been deactivated")

    # Check if link has expired
    if link["expires_at"]:
        expires_at = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00"))
        if datetime.now(expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=403, detail="This link has expired")

    # Get the recipe
    recipe_response = (
        supabase.table("recipes")
        .select("*")
        .eq("id", link["recipe_id"])
        .single()
        .execute()
    )

    if not recipe_response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe = recipe_response.data

    # If user is authenticated, get their status
    if current_user:
        status_response = (
            supabase.table("user_recipe_status")
            .select("status")
            .eq("user_id", str(current_user.id))
            .eq("recipe_id", link["recipe_id"])
            .execute()
        )

        if status_response.data:
            recipe["status"] = status_response.data[0]["status"]

    return recipe


@router.delete("/recipes/{recipe_id}/public-link", status_code=204)
async def delete_public_link(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Delete/deactivate a public link. Only the user who created the link can delete it."""
    supabase = get_supabase()

    # Verify the link exists and user created it
    link_response = (
        supabase.table("public_recipe_links")
        .select("created_by, recipe_id")
        .eq("recipe_id", str(recipe_id))
        .single()
        .execute()
    )

    if not link_response.data:
        raise HTTPException(status_code=404, detail="Public link not found")

    if link_response.data["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete public links you created")

    # Delete the link
    supabase.table("public_recipe_links").delete().eq("recipe_id", str(recipe_id)).execute()

    return None


@router.get("/recipes/{recipe_id}/public-link", response_model=Optional[PublicLink])
async def get_public_link(
    recipe_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Get the public link for a recipe if it exists."""
    supabase = get_supabase()

    # Verify the recipe exists
    recipe_response = (
        supabase.table("recipes")
        .select("id")
        .eq("id", str(recipe_id))
        .single()
        .execute()
    )

    if not recipe_response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Get the public link
    link_response = (
        supabase.table("public_recipe_links")
        .select("*")
        .eq("recipe_id", str(recipe_id))
        .execute()
    )

    if link_response.data:
        return link_response.data[0]
    
    return None
