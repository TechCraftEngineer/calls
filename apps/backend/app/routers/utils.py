"""Utility functions for routers."""

import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from mutagen.mp3 import MP3
from mutagen import File

# In Docker container: /app/records, on VPS/server: project root / records
# Check if we're in Docker container
import os
# Проверяем переменную окружения (приоритет) или наличие .dockerenv (надежный индикатор Docker контейнера)
deployment_env = os.getenv("DEPLOYMENT_ENV", "").lower()
is_docker = (
    deployment_env == "docker" or
    Path("/.dockerenv").exists() or
    (os.name != 'nt' and Path("/app").exists() and Path("/app").is_absolute())
)
if is_docker:
    # Docker container (Unix-like system)
    RECORDS_DIR = Path("/app/records")
else:
    # Local development or VPS server: from backend/app/routers/utils.py -> records (project root)
    # __file__ is backend/app/routers/utils.py
    # parent.parent.parent.parent goes to project root
    RECORDS_DIR = Path(__file__).parent.parent.parent.parent / "records"


def get_mp3_duration(file_path: Path) -> float:
    """Get MP3 file duration in seconds."""
    if not file_path.exists():
        return 0.0
    
    try:
        if File:
            audio_file = File(str(file_path))
            if audio_file is not None:
                return float(audio_file.info.length)
        elif MP3:
            audio = MP3(str(file_path))
            return float(audio.info.length)
    except Exception as e:
        print(f"Error getting MP3 duration {file_path}: {e}")
    
    return 0.0


def format_duration_readable(seconds: float) -> str:
    """Format duration in readable format: 30с or 1м 20с"""
    if not seconds or seconds <= 0:
        return "—"
    total_seconds = int(seconds)
    minutes = total_seconds // 60
    secs = total_seconds % 60
    
    if minutes == 0:
        return f"{secs}с"
    elif secs == 0:
        return f"{minutes}м"
    else:
        return f"{minutes}м {secs}с"


def normalize_phone_for_filter(phone: str) -> List[str]:
    """
    Нормализует номер телефона и возвращает список вариантов для SQL IN (?):
    канонический вид (7...) и вариант с 8 в начале (8...), чтобы совпадали и 79255502685, и 89255502685.
    """
    if not phone or not isinstance(phone, str):
        return []
    s = phone.strip().replace("+", "").replace(" ", "").replace("-", "")
    if not s or not s.isdigit():
        return []
    if len(s) == 11 and s.startswith("8"):
        s = "7" + s[1:]
    variants = [s]
    if len(s) == 11 and s.startswith("7"):
        variants.append("8" + s[1:])
    return list(dict.fromkeys(variants))  # unique, order preserved


def count_words(text: str) -> int:
    """Count words in text."""
    if not text:
        return 0
    words = [w for w in text.split() if w.strip()]
    return len(words)


def format_transcript_text(text: str) -> str:
    """Format transcript text: each line with speaker name."""
    if not text:
        return ""
    
    # Check if already formatted
    if '\n' in text:
        if '\n\n' in text or re.search(r'[А-Яа-яЁёA-Za-z\s]+?:\s+[^\n]+\n\n[А-Яа-яЁёA-Za-z\s]+?:', text):
            lines = text.split('\n')
            formatted_lines = []
            for line in lines:
                if not line.strip():
                    formatted_lines.append("")
                else:
                    line = re.sub(r'[ \t]+', ' ', line.strip())
                    formatted_lines.append(line)
            return '\n'.join(formatted_lines)
    
    # Main pattern: find "Name: text"
    pattern = r'([А-Яа-яЁёA-Za-z\s]+?):\s*([^:]+?)(?=\s+[А-Яа-яЁёA-Za-z\s]+?:|$)'
    matches = list(re.finditer(pattern, text, re.MULTILINE | re.DOTALL))
    
    if matches:
        formatted_lines = []
        previous_speaker = None
        for match in matches:
            speaker = match.group(1).strip()
            speech = match.group(2).strip()
            speech = re.sub(r'\s+', ' ', speech)
            
            if previous_speaker is not None and previous_speaker != speaker:
                formatted_lines.append("")
            
            formatted_lines.append(f"{speaker}: {speech}")
            previous_speaker = speaker
        
        result = "\n".join(formatted_lines)
        if result.strip():
            return result
    
    return text


def _megafon_internal_from_filename(filename: Optional[str]) -> Optional[str]:
    """Из имени файла Megafon извлекает internal_number (extension). Формат: {extension}_out_... или {extension}_in_..."""
    if not filename or not isinstance(filename, str):
        return None
    m = re.match(r"^(.+?)_(?:out|in)_", filename, re.IGNORECASE)
    return m.group(1).strip() if m else None


def attach_operator_names(items: List[Dict[str, Any]], storage) -> None:
    """Add operator names to calls based on internal number or call number (for Megafon mobile numbers)."""
    for item in items:
        call = item.get("call")
        if not call:
            continue
        
        operator_name = None
        
        # Сначала пробуем по internal_number (для Mango и Megafon)
        internal = str(call.get("internal_number") or "").strip()
        # Если в БД internal_number пустой — пробуем взять из имени файла (формат Megafon: xxx_out_... или xxx_in_...)
        if not internal:
            internal = _megafon_internal_from_filename(call.get("filename"))
            if internal:
                call["internal_number"] = internal
        if internal:
            try:
                operator_name = storage.get_operator_name_by_internal_number(internal)
            except Exception:
                pass
        
        # Если не нашли по internal_number, пробуем по номеру звонка (для Megafon)
        # Это работает когда звонок с/на мобильный номер сотрудника
        if not operator_name:
            call_number = str(call.get("number") or "").strip()
            if call_number:
                try:
                    operator_name = storage.get_operator_name_by_internal_number(call_number)
                except Exception:
                    pass
        
        if operator_name:
            call["operator_name"] = operator_name



def enrich_call_data(item: Dict[str, Any], records_dir: Path = RECORDS_DIR) -> None:
    """Enrich call data with duration, word count, rate, etc."""
    call = item.get("call")
    transcript = item.get("transcript")
    
    if not call:
        return
    
    # Get MP3 duration
    if call.get("filename"):
        file_path = records_dir / call["filename"]
        duration_seconds = get_mp3_duration(file_path)
        call["duration_seconds"] = duration_seconds
        call["duration_formatted"] = format_duration_readable(duration_seconds)
    else:
        call["duration_seconds"] = 0
        call["duration_formatted"] = "—"
    
    # Process transcript
    if transcript and transcript.get("text"):
        transcript_text = transcript["text"]
        word_count = count_words(transcript_text)
        transcript["word_count"] = word_count
        
        duration_seconds = call.get("duration_seconds", 0)
        if duration_seconds > 0:
            minutes = duration_seconds / 60.0
            rate = round(word_count / minutes) if minutes > 0 else 0
            transcript["rate"] = rate
        else:
            transcript["rate"] = 0
        
        transcript["formatted_text"] = format_transcript_text(transcript_text)
    elif transcript:
        transcript["word_count"] = 0
        transcript["rate"] = 0
        transcript["formatted_text"] = ""


def process_operator_source(call: Dict[str, Any]) -> None:
    """Сохраняем ФИО сотрудника. Если сопоставление не найдено — не подставляем Mango/Megafon."""
    manager_name = call.get("operator_name")
    if manager_name:
        call["manager_name"] = manager_name
    else:
        # При отсутствии сопоставления оставляем пусто — в UI отобразится «—»
        call["operator_name"] = None

