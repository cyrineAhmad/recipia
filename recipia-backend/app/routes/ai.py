from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_supabase
from app.models import (
    ChatMessage,
    ChatResponse,
    GenerateRecipeRequest,
    ImproveRecipeRequest,
    User,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(chat_data: ChatMessage, current_user: User = Depends(get_current_user)):
    supabase = get_supabase()
    context = None

    recipes = (
        supabase.table("recipes")
        .select("name, cuisine_type")
        .eq("created_by", str(current_user.id))
        .limit(5)
        .execute()
    )
    if recipes.data:
        context = {
            "user_recipes": [r["name"] for r in recipes.data],
            "favorite_cuisines": list({r["cuisine_type"] for r in recipes.data if r.get("cuisine_type")}),
        }

    try:
        result = await ai_service.chat(chat_data.message, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {e}")

    try:
        supabase.table("chat_messages").insert(
            {
                "user_id": str(current_user.id),
                "message": chat_data.message,
                "response": result.get("response", ""),
            }
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert error: {e}")

    return ChatResponse(
        response=result.get("response", ""),
        suggestions=result.get("suggestions", [])
    )


@router.post("/generate-recipe")
async def generate_recipe(
    request: GenerateRecipeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a new recipe using AI for the authenticated user.

    This endpoint returns the generated recipe but does not persist it.
    The client is responsible for saving via the recipes API.
    """
    try:
        recipe_data = await ai_service.generate_recipe(
            prompt=request.prompt,
            cuisine_type=request.cuisine_type,
            prep_time_max=request.prep_time_max,
        )

        if "error" in recipe_data:
            raise HTTPException(
                status_code=400,
                detail="Failed to generate recipe. Please try again.",
            )

        return {"recipe": recipe_data}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="AI recipe generation is currently unavailable"
        )


@router.post("/improve-recipe")
async def improve_recipe(
    request: ImproveRecipeRequest,
    current_user: User = Depends(get_current_user),
):
    """Improve an existing recipe using AI (authenticated users only)."""
    try:
        supabase = get_supabase()

        recipe = (
            supabase.table("recipes")
            .select("*")
            .eq("id", request.recipe_id)
            .single()
            .execute()
        )

        if not recipe.data:
            raise HTTPException(status_code=404, detail="Recipe not found")

        if recipe.data["created_by"] != str(current_user.id) and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        improved = await ai_service.improve_recipe(
            recipe=recipe.data,
            improvement_type=request.improvement_type,
        )

        return {
            "message": "Recipe improved!",
            "improved_recipe": improved,
            "original_recipe": recipe.data,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="AI recipe improvement is currently unavailable"
        )


@router.post("/suggest-by-ingredients")
async def suggest_by_ingredients(
    ingredients: List[str],
    current_user: User = Depends(get_current_user),
):
    """Get recipe suggestions based on available ingredients (authenticated)."""
    try:
        suggestions = await ai_service.suggest_recipes_based_on_ingredients(ingredients)

        return {
            "ingredients": ingredients,
            "suggested_recipes": suggestions,
        }

    except Exception:
        raise HTTPException(
            status_code=500, detail="AI suggestions are currently unavailable"
        )


@router.get("/chat-history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    limit: int = 20,
):
    """Get user's chat history with AI (authenticated)."""
    supabase = get_supabase()

    history = (
        supabase.table("chat_messages")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return {"history": history.data}