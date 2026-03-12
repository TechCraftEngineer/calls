from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from app.services.storage import SQLiteStorage
import calendar

# Assume we have an auth dependency, for now let's use a dummy or skip if not strictly enforced, 
# but it's better to use get_current_user if it exists. We'll import it correctly below.
from app.routers.auth import get_current_user

router = APIRouter(prefix="/kpi", tags=["kpi"])

class KPIResult(BaseModel):
    user_id: int
    name: str
    username: str
    base_salary: float
    target_bonus: float
    target_talk_time_minutes: float
    period_target_talk_time_minutes: float
    actual_talk_time_minutes: float
    kpi_completion_percentage: float
    calculated_bonus: float
    total_calculated_salary: float
    total_calls: int
    incoming: int
    outgoing: int
    missed: int

def get_storage():
    return SQLiteStorage()

@router.get("/", response_model=List[KPIResult])
async def get_kpi_data(
    start_date: date = Query(..., description="Start date of the period"),
    end_date: date = Query(..., description="End date of the period"),
    current_user: dict = Depends(get_current_user),
    storage: SQLiteStorage = Depends(get_storage)
):
    # Depending on requirements, maybe only admin can view all KPIs.
    # We will enforce this loosely for now.
    
    dt_start = datetime.combine(start_date, datetime.min.time())
    dt_end = datetime.combine(end_date, datetime.max.time())
    
    # Calculate period length vs month length for proportional target
    period_days = (end_date - start_date).days + 1
    
    # Approximate month length by using the start_date's month
    days_in_month = calendar.monthrange(start_date.year, start_date.month)[1]
    
    period_ratio = period_days / days_in_month if days_in_month > 0 else 1.0

    # We need to leverage ReportGenerator logic to get the filtered stats
    from app.services.reports import ReportGenerator
    # initialize with None services since we only need generate_period_stats
    report_gen = ReportGenerator(storage, None, None)
    
    stats = report_gen.generate_period_stats(dt_start, dt_end)
    
    results = []
    
    # Ensure stats are populated for all active users even if they have 0 calls
    with storage._get_connection() as conn:
        cursor = conn.execute("SELECT * FROM users WHERE is_active = 1")
        users = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

    for user in users:
        user_id = user["id"]
        user_stats = stats.get(user_id, {})
        
        base_salary = user.get("kpi_base_salary") or 0.0
        target_bonus = user.get("kpi_target_bonus") or 0.0
        target_talk_minutes = user.get("kpi_target_talk_time_minutes") or 0.0
        
        # Proportional target
        period_target_minutes = target_talk_minutes * period_ratio
        
        actual_talk_minutes = (user_stats.get("total_duration", 0)) / 60.0
        
        completion_percentage = 0.0
        if period_target_minutes > 0:
            completion_percentage = min(100.0, (actual_talk_minutes / period_target_minutes) * 100.0)
        elif target_talk_minutes == 0 and actual_talk_minutes > 0:
            completion_percentage = 100.0
            
        calculated_bonus = target_bonus * (completion_percentage / 100.0)
        total_salary = base_salary + calculated_bonus
        
        name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("username", "")
        
        results.append(
            KPIResult(
                user_id=user_id,
                name=name,
                username=user.get("username", ""),
                base_salary=base_salary,
                target_bonus=target_bonus,
                target_talk_time_minutes=target_talk_minutes,
                period_target_talk_time_minutes=round(period_target_minutes, 2),
                actual_talk_time_minutes=round(actual_talk_minutes, 2),
                kpi_completion_percentage=round(completion_percentage, 2),
                calculated_bonus=round(calculated_bonus, 2),
                total_calculated_salary=round(total_salary, 2),
                total_calls=user_stats.get("total_calls", 0),
                incoming=user_stats.get("incoming", 0),
                outgoing=user_stats.get("outgoing", 0),
                missed=user_stats.get("missed", 0)
            )
        )
        
    return results
