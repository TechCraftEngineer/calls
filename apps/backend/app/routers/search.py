"""Search router."""

from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from app.services.storage import SQLiteStorage
from app.dependencies import get_storage, get_current_user

router = APIRouter()


@router.get("")
async def search_transcripts(
    q: str = Query(..., min_length=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Search transcripts."""
    # Filter by user's internal numbers if not admin
    internal_numbers = None
    if current_user.get("username") != "admin@mango":
        user = storage.get_user_by_username(current_user.get("username"))
        if user and user.get("internal_numbers"):
            if user["internal_numbers"].strip().lower() != "all":
                internal_numbers = [num.strip() for num in user["internal_numbers"].split(",") if num.strip()]
    
    results = storage.search_transcripts(q, internal_numbers)
    return {
        "query": q,
        "results": results,
        "count": len(results)
    }

