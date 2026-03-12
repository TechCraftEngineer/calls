"""Pydantic models for request/response validation."""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# Authentication
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    internal_numbers: Optional[str] = None
    mobile_numbers: Optional[str] = None
    created_at: Optional[Any] = None
    telegram_chat_id: Optional[str] = None
    telegram_daily_report: Optional[bool] = False
    telegram_manager_report: Optional[bool] = False
    max_chat_id: Optional[str] = None
    max_daily_report: Optional[bool] = False
    max_manager_report: Optional[bool] = False
    filter_exclude_answering_machine: Optional[bool] = False
    filter_min_duration: Optional[int] = 0
    filter_min_replicas: Optional[int] = 0
    email: Optional[str] = None
    telegram_weekly_report: Optional[bool] = False
    telegram_monthly_report: Optional[bool] = False
    email_daily_report: Optional[bool] = False
    email_weekly_report: Optional[bool] = False
    email_monthly_report: Optional[bool] = False
    report_include_call_summaries: Optional[bool] = False
    report_detailed: Optional[bool] = False
    report_include_avg_value: Optional[bool] = False
    report_include_avg_rating: Optional[bool] = False
    kpi_base_salary: Optional[int] = 0
    kpi_target_bonus: Optional[int] = 0
    kpi_target_talk_time_minutes: Optional[int] = 0
    telegram_skip_weekends: Optional[bool] = False
    report_managed_user_ids: Optional[Any] = None  # JSON string or list from API


# Calls
class CallResponse(BaseModel):
    id: int
    filename: Optional[str] = None
    number: Optional[str] = None
    timestamp: datetime
    name: Optional[str] = None
    duration: Optional[int] = None
    direction: Optional[str] = None
    status: Optional[str] = None
    size_bytes: Optional[int] = None
    internal_number: Optional[str] = None
    source: Optional[str] = None
    operator_name: Optional[str] = None
    manager_name: Optional[str] = None
    duration_seconds: Optional[float] = None
    duration_formatted: Optional[str] = None
    customer_name: Optional[str] = None


# Transcripts
class TranscriptResponse(BaseModel):
    id: Optional[int] = None
    call_id: Optional[int] = None
    text: Optional[str] = None
    raw_text: Optional[str] = None
    title: Optional[str] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    summary: Optional[str] = None
    size_kb: Optional[float] = None
    caller_name: Optional[str] = None
    call_type: Optional[str] = None
    call_topic: Optional[str] = None
    word_count: Optional[int] = None
    rate: Optional[int] = None
    formatted_text: Optional[str] = None


# Evaluations
class EvaluationResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    id: Optional[int] = None
    call_id: Optional[int] = None
    is_quality_analyzable: Optional[bool] = None
    not_analyzable_reason: Optional[str] = None
    value_score: Optional[int] = None
    value_explanation: Optional[str] = None
    manager_score: Optional[float] = None
    manager_feedback: Optional[str] = None
    manager_breakdown: Optional[Dict[str, Any]] = None
    manager_recommendations: Optional[List[str]] = None


# Call with transcript and evaluation
class CallWithDetails(BaseModel):
    call: CallResponse
    transcript: Optional[TranscriptResponse] = None
    evaluation: Optional[EvaluationResponse] = None


# Pagination
class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 15


class CallFilters(BaseModel):
    query: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    direction: Optional[str] = None
    manager: Optional[str] = None
    value: Optional[List[int]] = None
    operator: Optional[List[str]] = None


class CallsListResponse(BaseModel):
    calls: List[CallWithDetails]
    pagination: Dict[str, Any]
    metrics: Dict[str, Any]
    managers: List[Dict[str, Any]]


# Users (UserResponse defined once at top of file with all fields including filter_*)

# Users
class UserCreate(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: Optional[str] = ""
    internal_numbers: Optional[str] = None
    mobile_numbers: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_daily_report: Optional[bool] = False
    telegram_manager_report: Optional[bool] = False
    max_chat_id: Optional[str] = None
    max_daily_report: Optional[bool] = False
    max_manager_report: Optional[bool] = False
    filter_exclude_answering_machine: Optional[bool] = False
    filter_min_duration: Optional[int] = 0
    filter_min_replicas: Optional[int] = 0
    email: Optional[str] = None
    telegram_weekly_report: Optional[bool] = False
    telegram_monthly_report: Optional[bool] = False
    email_daily_report: Optional[bool] = False
    email_weekly_report: Optional[bool] = False
    email_monthly_report: Optional[bool] = False
    report_include_call_summaries: Optional[bool] = False
    report_detailed: Optional[bool] = False
    report_include_avg_value: Optional[bool] = False
    report_include_avg_rating: Optional[bool] = False
    kpi_base_salary: Optional[int] = 0
    kpi_target_bonus: Optional[int] = 0
    kpi_target_talk_time_minutes: Optional[int] = 0
    telegram_skip_weekends: Optional[bool] = False
    report_managed_user_ids: Optional[List[int]] = None

class UserUpdate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    internal_numbers: Optional[str] = None
    mobile_numbers: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_daily_report: Optional[bool] = False
    telegram_manager_report: Optional[bool] = False
    max_chat_id: Optional[str] = None
    max_daily_report: Optional[bool] = False
    max_manager_report: Optional[bool] = False
    filter_exclude_answering_machine: Optional[bool] = False
    filter_min_duration: Optional[int] = 0
    filter_min_replicas: Optional[int] = 0
    email: Optional[str] = None
    telegram_weekly_report: Optional[bool] = False
    telegram_monthly_report: Optional[bool] = False
    email_daily_report: Optional[bool] = False
    email_weekly_report: Optional[bool] = False
    email_monthly_report: Optional[bool] = False
    report_include_call_summaries: Optional[bool] = False
    report_detailed: Optional[bool] = False
    report_include_avg_value: Optional[bool] = False
    report_include_avg_rating: Optional[bool] = False
    kpi_base_salary: Optional[int] = 0
    kpi_target_bonus: Optional[int] = 0
    kpi_target_talk_time_minutes: Optional[int] = 0
    telegram_skip_weekends: Optional[bool] = False
    report_managed_user_ids: Optional[List[int]] = None


class ChangePasswordRequest(BaseModel):
    new_password: str
    confirm_password: str


# Settings
class PromptResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[Any] = None


class PromptUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class SettingsUpdate(BaseModel):
    deepseek_model: Optional[str] = None
    quality_min_value_threshold: Optional[float] = None
    enable_manager_recommendations: Optional[bool] = None
    prompts: Optional[Dict[str, PromptUpdate]] = None
    telegram_bot_token: Optional[str] = None
    max_bot_token: Optional[str] = None


# Statistics
class StatisticsResponse(BaseModel):
    statistics: List[Dict[str, Any]]
    date_from: Optional[str] = None
    date_to: Optional[str] = None


# Metrics
class MetricsResponse(BaseModel):
    total_calls: int
    transcribed: int
    avg_duration: int
    last_sync: Optional[Any] = None


# AI Chat
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context_mode: str  # "general" | "calls"
    start_date: Optional[str] = None  # YYYY-MM-DD, required when context_mode == "calls"
    end_date: Optional[str] = None


class ChatResponse(BaseModel):
    content: str

