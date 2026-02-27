from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

from app.database import get_supabase
from app.models import User, UserCreate, UserLogin
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer()


class SignupResponse(BaseModel):
    message: str
    user: dict
    session: Optional[dict] = None


class LoginResponse(BaseModel):
    message: str
    user: dict
    session: dict


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Get authenticated user from Supabase access token.
    Raises 401 if invalid.
    """
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(credentials.credentials)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        # Fetch role from profiles table
        try:
            profile = (
                supabase.table("profiles")
                .select("*")
                .eq("id", response.user.id)
                .single()
                .execute()
            )
            profile_data = profile.data if profile.data else {}
        except Exception:
            profile_data = {}

        return User(
            id=response.user.id,
            email=response.user.email,
            full_name=profile_data.get("full_name"),
            role=profile_data.get("role", "user"),
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Require user to be admin.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user


@router.post("/signup", response_model=SignupResponse)
async def signup(user_data: UserCreate):
    try:
        supabase = get_supabase()

        response = supabase.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "full_name": user_data.full_name,
                    }
                },
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create user. Email might already be registered.",
            )

        return {
            "message": "User created successfully",
            "user": {
                "id": str(response.user.id),
                "email": response.user.email,
                "full_name": user_data.full_name,
            },
            "session": {
                "access_token": response.session.access_token
                if response.session
                else None,
                "refresh_token": response.session.refresh_token
                if response.session
                else None,
            }
            if response.session
            else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}",
        )


@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin):
    try:
        supabase = get_supabase()

        response = supabase.auth.sign_in_with_password(
            {
                "email": credentials.email,
                "password": credentials.password,
            }
        )

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Fetch profile
        try:
            profile = (
                supabase.table("profiles")
                .select("*")
                .eq("id", response.user.id)
                .single()
                .execute()
            )
            profile_data = profile.data if profile.data else {}
        except Exception:
            profile_data = {}

        return {
            "message": "Login successful",
            "user": {
                "id": str(response.user.id),
                "email": response.user.email,
                "full_name": profile_data.get("full_name"),
                "role": profile_data.get("role", "user"),
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
            },
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/logout")
async def logout():
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception:
        # Even if logout fails, we don't want to leak details
        return {"message": "Logged out successfully"}