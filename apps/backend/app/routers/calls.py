"""Calls router."""

from fastapi import APIRouter, Depends, HTTPException, Query, Path as PathParam
from typing import Optional, List
from pathlib import Path
import re
from datetime import datetime
from app.models.schemas import CallResponse, CallsListResponse, CallWithDetails
from app.services.storage import SQLiteStorage
from app.dependencies import get_storage, get_current_user, require_admin
from app.routers.utils import (
    enrich_call_data,
    attach_operator_names,
    process_operator_source,
    normalize_phone_for_filter,
    _megafon_internal_from_filename,
    RECORDS_DIR,
)
from app.services import deepseek

router = APIRouter()


def parse_filename(filename: str) -> Optional[dict]:
    """
    Парсит имя файла формата: YYYY-MM-DD__HH-MM-SS__Имя__Номер.mp3
    Также поддерживает другие форматы, например: admin_out_74952333355_2025_12_26-14_15_13_xqkt.mp3
    """
    # Стандартный формат: 2025-12-15__08-16-31__112__74952804535.mp3
    pattern1 = r"(\d{4}-\d{2}-\d{2})__(\d{2}-\d{2}-\d{2})__(\d+)__(\d+)\.mp3"
    match1 = re.match(pattern1, filename)
    if match1:
        date_str, time_str, internal_num, number = match1.groups()
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H-%M-%S")
            return {
                "timestamp": dt.isoformat(),
                "name": "",
                "number": number,
                "internal_number": internal_num,
                "direction": "Входящий",
            }
        except ValueError:
            pass
    
    # Формат: admin_out_74952333355_2025_12_26-14_15_13_xqkt.mp3
    pattern2 = r"admin_(out|in)_(\d+)_(\d{4}_\d{2}_\d{2})-(\d{2}_\d{2}_\d{2})_.*\.mp3"
    match2 = re.match(pattern2, filename)
    if match2:
        direction_str, number, date_str, time_str = match2.groups()
        try:
            dt = datetime.strptime(f"{date_str.replace('_', '-')} {time_str.replace('_', ':')}", "%Y-%m-%d %H:%M:%S")
            return {
                "timestamp": dt.isoformat(),
                "name": "",
                "number": number,
                "internal_number": "",
                "direction": "Исходящий" if direction_str == "out" else "Входящий",
            }
        except ValueError:
            pass
    
    # Формат: YYYY-MM-DD__HH-MM-SS__Имя__Номер.mp3
    pattern3 = r"(\d{4}-\d{2}-\d{2})__(\d{2}-\d{2}-\d{2})__(.+?)__(\d+)\.mp3"
    match3 = re.match(pattern3, filename)
    if match3:
        date_str, time_str, name, number = match3.groups()
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H-%M-%S")
            return {
                "timestamp": dt.isoformat(),
                "name": name.strip(),
                "number": number,
                "internal_number": "",
                "direction": "Входящий",
            }
        except ValueError:
            pass
    
    return None


@router.post("/{call_id}/recommendations")
async def generate_call_recommendations(
    call_id: int,
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """
    Генерирует рекомендации для звонка с учетом истории общения с клиентом.
    """
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
        
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript or not transcript.get("text"):
        raise HTTPException(status_code=400, detail="Transcript not found for this call")
        
    # Получаем историю звонков с этим номером
    history = []
    if call.get("number"):
        history = storage.get_call_history(
            number=call["number"], 
            limit=5, 
            exclude_call_id=call_id
        )
    
    # Генерируем рекомендации
    try:
        result = deepseek.generate_recommendations(transcript["text"], history_context=history)
        recommendations = result.get("manager_recommendations", [])
    except Exception as e:
        error_msg = str(e)
        # Проверяем тип ошибки для более информативного сообщения
        if "Authentication" in error_msg or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="Ошибка аутентификации с сервисом генерации рекомендаций. Проверьте настройки API ключа DeepSeek."
            )
        elif "rate limit" in error_msg.lower() or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Превышен лимит запросов к сервису генерации рекомендаций. Попробуйте позже."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при генерации рекомендаций: {error_msg}"
            )
    
    # Сохраняем в базу (обновляем существующую оценку или создаем новую)
    evaluation = storage.get_evaluation(call_id)
    
    # Подготавливаем данные для сохранения
    # Если оценки еще нет, создаем структуру с дефолтными значениями, но важно сохранить то, что есть
    eval_data = {
        "call_id": call_id,
        "manager_recommendations": recommendations,
        # Сохраняем остальные поля если они уже были
        "value_score": evaluation.get("value_score") if evaluation else None,
        "value_explanation": evaluation.get("value_explanation") if evaluation else None,
        "is_quality_analyzable": evaluation.get("is_quality_analyzable", True) if evaluation else True,
        "not_analyzable_reason": evaluation.get("not_analyzable_reason") if evaluation else None,
        "manager_score": evaluation.get("manager_score") if evaluation else None,
        "manager_feedback": evaluation.get("manager_feedback") if evaluation else None,
        "manager_breakdown": evaluation.get("manager_breakdown") if evaluation else None,
    }
    
    storage.add_evaluation(eval_data)
    
    return {"recommendations": recommendations}


@router.get("", response_model=CallsListResponse, response_model_by_alias=False)
async def list_calls(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    q: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    manager: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    value: Optional[List[int]] = Query(None),
    operator: Optional[List[str]] = Query(None),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """List calls with filtering and pagination."""
    metrics = storage.calculate_metrics()
    
    offset = (page - 1) * per_page
    
    # Process date filters
    if date_from and not date_to:
        date_to = date_from
    if date_to and not date_from:
        date_from = date_to
    
    if date_from:
        date_from = f"{date_from}T00:00:00"
    if date_to:
        date_to = f"{date_to}T23:59:59"
    
    # Process direction filter
    direction_filter = direction or "all"
    direction_value = None
    if direction_filter in ["incoming", "Входящий"]:
        direction_value = "Входящий"
    elif direction_filter in ["outgoing", "Исходящий"]:
        direction_value = "Исходящий"
    elif direction_filter == "missed":
        direction_value = None  # Special handling below
    else:
        direction_filter = "all"
    
    # Process manager filter
    manager_filter_numbers = None
    selected_manager_id = None
    if manager:
        try:
            manager_id_int = int(manager)
            manager_obj = storage.get_user(manager_id_int)
            if manager_obj and manager_obj.get("internal_numbers"):
                internal_nums_str = manager_obj["internal_numbers"]
                if internal_nums_str and internal_nums_str.strip().lower() != "all":
                    internal_nums_str = internal_nums_str.strip()
                    parsed_numbers = [num.strip() for num in internal_nums_str.split(",") if num.strip()]
                    if parsed_numbers:
                        manager_filter_numbers = parsed_numbers
                        selected_manager_id = str(manager_id_int)
        except (ValueError, TypeError):
            pass
    
    # Process value filter
    value_scores = None
    if value:
        value_scores = [v for v in value if isinstance(v, int)]
        if not value_scores:
            value_scores = None
    
    # Process operator filter
    operators = None
    if operator:
        operators = [op.strip() for op in operator if op.strip() in ['megafon', 'mango']]
        if not operators:
            operators = None
    
    # Process status filter (missed/answered)
    status_filter = status or "all"
    if status_filter not in ["all", "missed", "answered"]:
        status_filter = "all"
    
    # Filter by user's internal numbers (if not admin)
    internal_numbers = None
    username = current_user.get("username")
    admin_usernames = ["admin@mango", "admin@gmail.com"]
    
    # Check if user is admin by username or internal_numbers
    is_admin = username in admin_usernames
    if not is_admin:
        user = storage.get_user_by_username(username)
        if user and user.get("internal_numbers") and user["internal_numbers"] and user["internal_numbers"].strip().lower() == "all":
            is_admin = True
    
    mobile_numbers = None
    if not is_admin:
        user = storage.get_user_by_username(username)
        if user and user.get("internal_numbers"):
            if user.get("internal_numbers") and user["internal_numbers"].strip().lower() != "all":
                internal_numbers = [num.strip() for num in user["internal_numbers"].split(",") if num.strip()]
        if user and user.get("mobile_numbers") and user["mobile_numbers"].strip():
            raw_mobiles = [p.strip() for p in user["mobile_numbers"].split(",") if p.strip()]
            mobile_numbers = []
            seen = set()
            for p in raw_mobiles:
                for v in normalize_phone_for_filter(p):
                    if v not in seen:
                        seen.add(v)
                        mobile_numbers.append(v)
            if not mobile_numbers:
                mobile_numbers = None
    
    # Override with manager filter if set
    if manager_filter_numbers:
        internal_numbers = manager_filter_numbers
    
    # Handle search query
    if q:
        found_transcripts = storage.search_transcripts(q, internal_numbers, mobile_numbers)
        calls_with_transcripts = []
        
        for transcript in found_transcripts:
            call_id = transcript.get("call_id")
            if not call_id:
                continue
            
            call = storage.get_call(call_id)
            if not call:
                continue
            
            # Apply direction filter
            call_direction = call.get("direction") or "Входящий"
            if direction_value and call_direction != direction_value:
                continue
            
            # Apply value filter
            if value_scores:
                evaluation = storage.get_evaluation(call_id)
                if not evaluation or not evaluation.get("value_score"):
                    continue
                if evaluation.get("value_score") not in value_scores:
                    continue
            
            # Apply date filter
            if date_from or date_to:
                call_timestamp = call.get("timestamp")
                if call_timestamp:
                    if isinstance(call_timestamp, str):
                        call_ts_str = call_timestamp
                        if ' ' in call_ts_str and 'T' not in call_ts_str:
                            call_ts_str = call_ts_str.replace(' ', 'T', 1)
                    else:
                        call_ts_str = call_timestamp.isoformat()
                    
                    if date_from and call_ts_str < date_from:
                        continue
                    if date_to and call_ts_str > date_to:
                        continue
            
            transcript_clean = {
                "id": transcript.get("id"),
                "call_id": transcript.get("call_id"),
                "text": transcript.get("text"),
                "title": transcript.get("title"),
                "sentiment": transcript.get("sentiment"),
                "confidence": transcript.get("confidence"),
                "summary": transcript.get("summary"),
                "size_kb": transcript.get("size_kb"),
                "call_type": transcript.get("call_type"),
                "call_topic": transcript.get("call_topic"),
            }
            
            evaluation = storage.get_evaluation(call_id)
            
            calls_with_transcripts.append({
                "call": call,
                "transcript": transcript_clean,
                "evaluation": evaluation
            })
        
        total_items = len(calls_with_transcripts)
        total_pages = 1
    else:
        # Handle status filter (missed/answered) - this works independently of direction
        if status_filter == "missed":
            # Missed calls are incoming calls with duration = 0
            # Override direction to "Входящий" for missed calls
            missed_direction = "Входящий"
            # But respect direction filter if it's set to outgoing (no missed outgoing calls)
            if direction_value == "Исходящий":
                missed_direction = None  # This will result in empty results
            
            calls_with_transcripts = storage.get_calls_with_transcripts(
                limit=1000,
                offset=0,
                date_from=date_from,
                date_to=date_to,
                internal_numbers=internal_numbers,
                mobile_numbers=mobile_numbers,
                direction=missed_direction,
                value_scores=value_scores,
                operators=operators
            )
            
            # Filter by duration = 0
            filtered_calls = []
            for item in calls_with_transcripts:
                call = item["call"]
                if call.get("filename"):
                    file_path = RECORDS_DIR / call["filename"]
                    from app.routers.utils import get_mp3_duration
                    duration = get_mp3_duration(file_path)
                    call["duration_seconds"] = duration
                else:
                    call["duration_seconds"] = 0
                
                if call["duration_seconds"] == 0:
                    filtered_calls.append(item)
            
            calls_with_transcripts = filtered_calls
            total_items = len(calls_with_transcripts)
            calls_with_transcripts = calls_with_transcripts[offset:offset+per_page]
            total_pages = (total_items + per_page - 1) // per_page
        elif status_filter == "answered":
            # Get all calls first, then filter by duration > 0
            calls_with_transcripts = storage.get_calls_with_transcripts(
                limit=1000,
                offset=0,
                date_from=date_from,
                date_to=date_to,
                internal_numbers=internal_numbers,
                mobile_numbers=mobile_numbers,
                direction=direction_value,
                value_scores=value_scores,
                operators=operators
            )
            
            # Filter by duration > 0
            filtered_calls = []
            for item in calls_with_transcripts:
                call = item["call"]
                if call.get("filename"):
                    file_path = RECORDS_DIR / call["filename"]
                    from app.routers.utils import get_mp3_duration
                    duration = get_mp3_duration(file_path)
                    call["duration_seconds"] = duration
                else:
                    call["duration_seconds"] = 0
                
                if call["duration_seconds"] > 0:
                    filtered_calls.append(item)
            
            calls_with_transcripts = filtered_calls
            total_items = len(calls_with_transcripts)
            calls_with_transcripts = calls_with_transcripts[offset:offset+per_page]
            total_pages = (total_items + per_page - 1) // per_page
        else:
            # status_filter == "all" - get calls normally
            calls_with_transcripts = storage.get_calls_with_transcripts(
                limit=per_page,
                offset=offset,
                date_from=date_from,
                date_to=date_to,
                internal_numbers=internal_numbers,
                mobile_numbers=mobile_numbers,
                direction=direction_value,
                value_scores=value_scores,
                operators=operators
            )
            total_items = storage.count_calls(
                date_from=date_from,
                date_to=date_to,
                internal_numbers=internal_numbers,
                mobile_numbers=mobile_numbers,
                direction=direction_value,
                value_scores=value_scores,
                operators=operators
            )
            total_pages = (total_items + per_page - 1) // per_page
    
    # Attach operator names
    attach_operator_names(calls_with_transcripts, storage)
    
    # Process operator source and manager names
    for item in calls_with_transcripts:
        call = item.get("call")
        if call:
            process_operator_source(call)
    
    # Enrich call data
    for item in calls_with_transcripts:
        enrich_call_data(item)
        if "evaluation" not in item:
            evaluation = storage.get_evaluation(item["call"]["id"])
            item["evaluation"] = evaluation
    
    # Подмена устаревшего value_explanation (ошибка by_alias) в списке
    for item in calls_with_transcripts:
        ev = item.get("evaluation")
        if ev and ev.get("value_explanation"):
            v = str(ev["value_explanation"])
            if "by_alias" in v and "NoneType" in v:
                ev["value_explanation"] = "Оценка не выполнена. Нажмите «Перезапустить анализ» для повторной оценки."
    
    # Get managers list
    all_managers = storage.get_all_users()
    managers_list = [
        m for m in all_managers
        if m.get("internal_numbers") and m["internal_numbers"] and m["internal_numbers"].strip().lower() != "all"
    ]
    
    return CallsListResponse(
        calls=calls_with_transcripts,
        pagination={
            "page": page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "next_num": page + 1,
            "prev_num": page - 1,
            "query": q or "",
            "date_from": date_from or "",
            "date_to": date_to or "",
            "direction": direction_filter,
            "status": status_filter,
            "manager": selected_manager_id or manager or "",
            "value": value or [],
            "operator": operator or [],
        },
        metrics=metrics,
        managers=managers_list,
    )


@router.get("/{call_id}", response_model=CallWithDetails, response_model_by_alias=False)
async def get_call(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get call details."""
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    transcript = storage.get_transcript_by_call_id(call_id)
    evaluation = storage.get_evaluation(call_id)
    
    # Add operator name (при пустом internal_number берём из имени файла, формат Megafon)
    internal = str(call.get("internal_number") or "").strip()
    if not internal:
        internal = _megafon_internal_from_filename(call.get("filename"))
        if internal:
            call["internal_number"] = internal
    if internal:
        try:
            call["operator_name"] = storage.get_operator_name_by_internal_number(internal)
        except Exception:
            call["operator_name"] = None
    
    # Add duration
    if call.get("filename"):
        file_path = RECORDS_DIR / call["filename"]
        from app.routers.utils import get_mp3_duration, format_duration_readable
        duration_seconds = get_mp3_duration(file_path)
        call["duration_seconds"] = duration_seconds
        call["duration_formatted"] = format_duration_readable(duration_seconds)
    else:
        call["duration_seconds"] = 0
        call["duration_formatted"] = "—"
    
    # Явно создаем EvaluationResponse для правильной сериализации (response_model_by_alias=False в декораторе)
    evaluation_response = None
    if evaluation:
        # Подмена устаревшего текста ошибки сериализации — чтобы не показывать пользователю техническое сообщение
        value_expl = evaluation.get("value_explanation") or ""
        if "by_alias" in value_expl and "NoneType" in value_expl:
            evaluation = {**evaluation, "value_explanation": "Оценка не выполнена. Нажмите «Перезапустить анализ» для повторной оценки."}
            print(f"=== [CALLS] call_id={call_id}: заменён устаревший value_explanation (by_alias) на подсказку пользователю ===")
        try:
            from app.models.schemas import EvaluationResponse
            evaluation_response = EvaluationResponse(**evaluation)
        except Exception as model_error:
            print(f"=== [CALLS] Error creating EvaluationResponse: {model_error} ===")
            print(f"=== [CALLS] evaluation: {evaluation} ===")
            evaluation_response = evaluation
    
    return CallWithDetails(
        call=call,
        transcript=transcript,
        evaluation=evaluation_response,
    )


@router.delete("/{call_id}")
async def delete_call(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Delete a call (admin only)."""
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Delete audio file
    if call.get("filename"):
        file_path = RECORDS_DIR / call["filename"]
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass
    
    deleted = storage.delete_call(call_id)
    if deleted:
        try:
            from app.services.vector_db import delete_by_call_id
            delete_by_call_id(call_id)
        except Exception:
            pass
        storage.add_activity_log("info", f"Deleted call #{call_id}", admin_user.get("username", "system"))
        return {"success": True, "message": f"Call #{call_id} deleted"}
    
    raise HTTPException(status_code=500, detail="Failed to delete call")


@router.post("/sync", response_model=dict)
async def sync_records(
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(require_admin),
):
    """Синхронизирует записи из папки records с базой данных."""
    if not RECORDS_DIR.exists():
        raise HTTPException(status_code=404, detail="Records directory not found")
    
    # Получаем существующие звонки для проверки дубликатов
    existing_calls = {c.get("filename"): c for c in storage.calls}
    
    # Сканируем папку records
    mp3_files = list(RECORDS_DIR.glob("*.mp3"))
    added = 0
    skipped = 0
    errors = 0
    
    for file_path in mp3_files:
        filename = file_path.name
        
        # Пропускаем если уже есть в БД
        if filename in existing_calls:
            skipped += 1
            continue
        
        # Парсим имя файла
        parsed = parse_filename(filename)
        if not parsed:
            # Если не удалось распарсить, создаем запись с базовой информацией
            try:
                # Пытаемся извлечь дату из имени файла любым способом
                file_stat = file_path.stat()
                file_mtime = datetime.fromtimestamp(file_stat.st_mtime)
                parsed = {
                    "timestamp": file_mtime.isoformat(),
                    "name": "",
                    "number": "",
                    "internal_number": "",
                    "direction": "Входящий",
                }
            except Exception:
                errors += 1
                continue
        
        # Получаем размер файла
        try:
            file_size = file_path.stat().st_size
        except Exception:
            file_size = 0
        
        # Создаем запись звонка
        call_data = {
            "filename": filename,
            "number": parsed.get("number", ""),
            "timestamp": parsed.get("timestamp", datetime.now().isoformat()),
            "name": parsed.get("name", ""),
            "duration": 0,
            "direction": parsed.get("direction", "Входящий"),
            "status": "Завершён",
            "size_bytes": file_size,
            "internal_number": parsed.get("internal_number", ""),
            "source": "filesystem",  # Источник - файловая система
        }
        
        try:
            storage.add_call(call_data)
            added += 1
        except Exception as e:
            errors += 1
            print(f"Error adding call {filename}: {e}")
    
    storage.add_activity_log("info", f"Синхронизация записей: добавлено {added}, пропущено {skipped}, ошибок {errors}", current_user.get("username", "system"))
    
    return {
        "success": True,
        "message": f"Синхронизация завершена: добавлено {added}, пропущено {skipped}, ошибок {errors}",
        "added": added,
        "skipped": skipped,
        "errors": errors,
        "total_files": len(mp3_files),
    }

