from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ============= Auth Models =============
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = Field(None, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class User(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str = "user"

    class Config:
        from_attributes = True

# ============= Recipe Models =============
class RecipeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    ingredients: List[str] = Field(..., min_items=1)
    instructions: List[str] = Field(..., min_items=1)
    cuisine_type: Optional[str] = Field(None, max_length=50)
    prep_time_minutes: Optional[int] = Field(None, ge=0, le=1440)  # Max 24 hours
    image_url: Optional[str] = Field(None, max_length=500)

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    ingredients: Optional[List[str]] = Field(None, min_items=1)
    instructions: Optional[List[str]] = Field(None, min_items=1)
    cuisine_type: Optional[str] = Field(None, max_length=50)
    prep_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    image_url: Optional[str] = Field(None, max_length=500)

class Recipe(RecipeBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    status: Optional[str] = None  # User's status if logged in

    class Config:
        from_attributes = True

# ============= Status Models =============
class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(favorite|to_try|made_before)$")

# ============= AI Models =============
class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None

class GenerateRecipeRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)
    cuisine_type: Optional[str] = Field(None, max_length=50)
    prep_time_max: Optional[int] = Field(None, ge=1, le=1440)

class ImproveRecipeRequest(BaseModel):
    recipe_id: str = Field(..., min_length=1)
    improvement_type: str = Field(
        default="detailed", 
        pattern="^(detailed|simpler|healthier)$"
    )

# ============= Sharing Models =============
class RecipeShareCreate(BaseModel):
    shared_with_email: str = Field(..., description="Email of the user to share with")
    permission: str = Field(default="view", pattern="^(view|edit)$")

class RecipeShare(BaseModel):
    id: UUID
    recipe_id: UUID
    shared_by: UUID
    shared_with: UUID
    permission: str
    created_at: datetime

    class Config:
        from_attributes = True

class PublicLinkCreate(BaseModel):
    recipe_id: UUID
    expires_at: Optional[datetime] = None

class PublicLink(BaseModel):
    id: UUID
    recipe_id: UUID
    created_by: UUID
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ============= Notification Models =============
class Notification(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    recipe_id: Optional[UUID] = None
    shared_by: Optional[UUID] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    notification_ids: List[UUID] = Field(..., min_items=1)