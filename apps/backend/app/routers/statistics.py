"""Statistics router."""

from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from app.models.schemas import StatisticsResponse, MetricsResponse
from app.services.storage import SQLiteStorage
from app.dependencies import get_storage, get_current_user, require_admin

router = APIRouter()


@router.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort: Optional[str] = Query("name"),
    order: Optional[str] = Query("asc"),
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Get statistics by internal numbers (admin only)."""
    from datetime import datetime, timedelta
    
    # Default to last 30 days if no dates provided
    if not date_from and not date_to:
        date_to = datetime.now().date()
        date_from = (datetime.now() - timedelta(days=30)).date()
        date_from_str = date_from.strftime('%Y-%m-%d')
        date_to_str = date_to.strftime('%Y-%m-%d')
    else:
        if date_from and not date_to:
            date_to = date_from
        if date_to and not date_from:
            date_from = date_to
        date_from_str = date_from
        date_to_str = date_to
    
    # Add time for filtering
    if date_from_str:
        date_from_db = f"{date_from_str} 00:00:00"
    else:
        date_from_db = None
    if date_to_str:
        date_to_db = f"{date_to_str} 23:59:59"
    else:
        date_to_db = None
    
    stats = storage.get_evaluations_stats(
        date_from=date_from_db,
        date_to=date_to_db
    )
    
    stats_list = list(stats.values())
    
    # Sort
    reverse = order == "desc"
    
    def get_sort_key(item):
        if sort == "incoming_count":
            return item["incoming"]["count"]
        elif sort == "outgoing_count":
            return item["outgoing"]["count"]
        elif sort == "avg_score":
            return 0  # TODO: Calculate average score
        return item["name"]
    
    stats_list.sort(key=get_sort_key, reverse=reverse)
    
    return StatisticsResponse(
        statistics=stats_list,
        date_from=date_from_str,
        date_to=date_to_str
    )


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get dashboard metrics."""
    metrics = storage.calculate_metrics()
    return metrics

