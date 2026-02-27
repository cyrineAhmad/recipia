from supabase import Client, create_client

from app.config import settings

primary_key = settings.supabase_service_key or settings.supabase_key
supabase: Client = create_client(settings.supabase_url, primary_key)


def get_supabase() -> Client:
    return supabase