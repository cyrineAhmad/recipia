from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_supabase
from app.models import Notification, NotificationMarkRead, User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[Notification])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    unread_only: bool = False,
):
    """Get notifications for the current user."""
    supabase = get_supabase()

    query = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", str(current_user.id))
    )

    if unread_only:
        query = query.eq("is_read", False)

    response = query.order("created_at", desc=True).limit(limit).execute()

    return response.data or []


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    supabase = get_supabase()

    response = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("user_id", str(current_user.id))
        .eq("is_read", False)
        .execute()
    )

    return {"count": response.count or 0}


@router.post("/mark-read")
async def mark_notifications_read(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
):
    """Mark one or more notifications as read."""
    supabase = get_supabase()

    # Convert UUIDs to strings
    notification_ids = [str(nid) for nid in data.notification_ids]

    # Update notifications
    response = (
        supabase.table("notifications")
        .update({"is_read": True})
        .in_("id", notification_ids)
        .eq("user_id", str(current_user.id))
        .execute()
    )

    return {"message": "Notifications marked as read", "count": len(response.data or [])}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    supabase = get_supabase()

    response = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("user_id", str(current_user.id))
        .eq("is_read", False)
        .execute()
    )

    return {"message": "All notifications marked as read", "count": len(response.data or [])}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    supabase = get_supabase()

    # Verify the notification belongs to the user
    existing = (
        supabase.table("notifications")
        .select("user_id")
        .eq("id", str(notification_id))
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    if existing.data["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    supabase.table("notifications").delete().eq("id", str(notification_id)).execute()

    return None


@router.delete("", status_code=204)
async def delete_all_notifications(
    current_user: User = Depends(get_current_user),
):
    """Delete all notifications for the current user."""
    supabase = get_supabase()

    supabase.table("notifications").delete().eq("user_id", str(current_user.id)).execute()

    return None
