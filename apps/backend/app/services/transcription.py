"""Transcription orchestration service."""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.services.assemblyai import transcribe_audio as assemblyai_transcribe

logger = logging.getLogger(__name__)
from app.services.salutespeech import transcribe_audio as salutespeech_transcribe
from app.services.deepseek import analyze_speakers, generate_summary, evaluate_call, extract_customer_name
from app.services.storage import SQLiteStorage

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
    # Local development or VPS server: from backend/app/services/transcription.py -> records (project root)
    # __file__ is backend/app/services/transcription.py
    # parent.parent.parent.parent goes to project root
    RECORDS_DIR = Path(__file__).parent.parent.parent.parent / "records"

import time
try:
    with open(str(RECORDS_DIR / "module_load_transcription.txt"), "a") as f:
        f.write(f"[{time.ctime()}] Transcription module loaded\n")
except Exception: pass


async def transcribe_call(
    call_id: int,
    storage: SQLiteStorage,
    model: str = "assemblyai",
) -> Dict[str, Any]:
    """
    Orchestrate the full transcription process:
    1. Transcription (AssemblyAI or SaluteSpeech)
    2. DeepSeek speaker analysis
    3. DeepSeek summary generation
    4. AI evaluation
    
    Args:
        call_id: ID звонка для транскрипции
        storage: Экземпляр хранилища данных
        model: Модель транскрипции ("assemblyai" или "salutespeech")
    """
    print(f"=== [TRANSCRIPTION] Request for Call {call_id}, Model: {model} ===", flush=True)
    import sys
    print(f"DEBUG: Entering transcribe_call for {call_id}", file=sys.stderr, flush=True)
    
    call = storage.get_call(call_id)
    if not call:
        raise ValueError(f"Call {call_id} not found")
    
    # Check for existing transcript
    existing_transcript = storage.get_transcript_by_call_id(call_id)
    if existing_transcript:
        print(f"=== [TRANSCRIPTION] Transcript exists for Call {call_id}. Deleting old transcript to re-transcribe. ===")
        storage.delete_transcript(existing_transcript["id"])
    
    filename = call.get("filename")
    if not filename:
        raise ValueError("No filename specified for call")
    
    audio_path = RECORDS_DIR / filename
    print(f"=== [TRANSCRIPTION] RECORDS_DIR: {RECORDS_DIR.absolute()} ===")
    print(f"=== [TRANSCRIPTION] Looking for audio file: {audio_path.absolute()} ===")
    print(f"=== [TRANSCRIPTION] File exists: {audio_path.exists()} ===")
    
    if not audio_path.exists():
        # Попробуем найти файл в других возможных местах
        possible_paths = [
            Path(__file__).parent.parent.parent.parent / "records" / filename,
            Path("records") / filename,
            Path("../records") / filename,
        ]
        print(f"=== [TRANSCRIPTION] Trying alternative paths: ===")
        for alt_path in possible_paths:
            print(f"  - {alt_path.absolute()}: {alt_path.exists()}")
            if alt_path.exists():
                audio_path = alt_path
                print(f"=== [TRANSCRIPTION] Found file at: {audio_path.absolute()} ===")
                break
        else:
            raise FileNotFoundError(f"Audio file not found: {audio_path.absolute()}. RECORDS_DIR: {RECORDS_DIR.absolute()}")
    
    try:
        # Step 1: Transcribe with selected model
        print(f"=== [TRANSCRIPTION] Calling transcribe_audio with model: {model} ===")
        print(f"=== [TRANSCRIPTION] Audio file path: {audio_path.absolute()} ===")
        print(f"=== [TRANSCRIPTION] File size: {audio_path.stat().st_size if audio_path.exists() else 'N/A'} bytes ===")
        
        if model == "salutespeech":
            print(f"=== [TRANSCRIPTION] Starting SaluteSpeech transcription ===")
            print(f"=== [TRANSCRIPTION] Internal number: {call.get('internal_number')} ===")
            print(f"=== [TRANSCRIPTION] Direction: {call.get('direction')} ===")
            print(f"DEBUG: Calling salutespeech_transcribe with {audio_path}", file=sys.stderr, flush=True)
            raw_transcript = salutespeech_transcribe(
                audio_path,
                call.get("internal_number"),
                call.get("direction"),
                enable_diarization=True,
                speakers_count=2
            )
            print(f"DEBUG: salutespeech_transcribe returned: {len(raw_transcript) if raw_transcript else 'NONE'}", file=sys.stderr, flush=True)
            service_name = "SaluteSpeech"
            print(f"=== [TRANSCRIPTION] SaluteSpeech returned: {len(raw_transcript) if raw_transcript else 0} chars ===")
        else:
            # Default to AssemblyAI
            raw_transcript = assemblyai_transcribe(
                audio_path,
                call.get("internal_number"),
                call.get("direction")
            )
            service_name = "AssemblyAI"
        
        if not raw_transcript:
            error_msg = f"Transcription returned empty result from {service_name}"
            print(f"=== [TRANSCRIPTION] ERROR: {error_msg} ===")
            print(f"=== [TRANSCRIPTION] This can happen if:")
            print(f"=== [TRANSCRIPTION]   1. Audio file is too short or silent")
            print(f"=== [TRANSCRIPTION]   2. Audio quality is too poor")
            print(f"=== [TRANSCRIPTION]   3. API service returned empty response")
            print(f"=== [TRANSCRIPTION]   4. Audio format is not supported")
            raise ValueError(error_msg)
        
        print(f"=== [TRANSCRIPTION] {service_name} transcription success. Length: {len(raw_transcript)} chars")
        
        # Step 2: Get manager name
        manager_name = None
        internal_number = call.get("internal_number")
        if internal_number:
            try:
                manager_name = storage.get_operator_name_by_internal_number(internal_number)
                if manager_name:
                    print(f"=== [TRANSCRIPTION] Manager identified: {manager_name} (internal: {internal_number}) ===")
                else:
                    print(f"=== [TRANSCRIPTION] Manager NOT identified for internal number: {internal_number} ===")
            except Exception as e:
                print(f"=== [TRANSCRIPTION] WARN: Could not get manager name: {e} ===")
        
        # Step 3: Analyze speakers with DeepSeek
        print(f"=== [TRANSCRIPTION] Analyzing speakers through DeepSeek... ===")
        transcript_text = analyze_speakers(
            raw_transcript,
            direction=call.get("direction"),
            manager_name=manager_name
        )
        
        if not transcript_text:
            print(f"=== [TRANSCRIPTION] WARN: Speaker analysis failed, using raw transcript ===")
            transcript_text = raw_transcript
        
        print(f"=== [TRANSCRIPTION] Final transcript length: {len(transcript_text)} chars ===")
        
        # Step 3.5: Extract customer name
        print(f"=== [TRANSCRIPTION] Extracting customer name... ===")
        customer_name = None
        if transcript_text:
            try:
                manager_name_for_prompt = manager_name or "Оператор"
                customer_name = extract_customer_name(
                    transcript_text,
                    manager_name=manager_name_for_prompt,
                    direction=call.get("direction")
                )
                if customer_name:
                    # Save customer name to call record
                    storage.update_call(call_id, {"customer_name": customer_name})
                    print(f"=== [TRANSCRIPTION] Customer name saved: {customer_name} ===")
                else:
                    print(f"=== [TRANSCRIPTION] Customer name not found ===")
            except Exception as e_cust:
                print(f"=== [TRANSCRIPTION] WARN: Error extracting customer name: {e_cust} ===")
                import traceback
                traceback.print_exc()
        
        # Step 4: Generate summary
        print(f"=== [TRANSCRIPTION] Generating summary... ===")
        call_type_context = None
        summary = generate_summary(
            transcript_text,
            direction=call.get("direction"),
            call_type_context=call_type_context
        )
        print(f"=== [TRANSCRIPTION] Summary generated. Title: {summary.get('title')} ===")
        print(f"=== [TRANSCRIPTION] Caller: {summary.get('caller_name')}, Type: {summary.get('call_type')} ===")
        
        # Step 5: Save transcript
        print(f"=== [TRANSCRIPTION] Saving to database... ===")
        transcript_data = {
            "call_id": call_id,
            "text": transcript_text,
            "raw_text": raw_transcript,
            "title": summary["title"],
            "sentiment": summary["sentiment"],
            "confidence": summary["confidence"],
            "summary": summary.get("summary", ""),
            "caller_name": summary.get("caller_name"),
            "call_type": summary.get("call_type"),
            "call_topic": summary.get("call_topic"),
            "size_kb": len(transcript_text.encode("utf-8")) // 1024,
        }
        transcript_id = storage.add_transcript(transcript_data)
        print(f"=== [TRANSCRIPTION] Transcript saved successfully ===")
        
        # Index transcript for RAG (vector DB)
        try:
            from datetime import datetime as dt
            from app.services.vector_db import add_chunks
            ts = call.get("timestamp")
            if isinstance(ts, dt):
                date_str = ts.strftime("%Y-%m-%d")
            elif isinstance(ts, str):
                date_str = ts[:10] if len(ts) >= 10 else ""
            else:
                date_str = ""
            n_chunks = add_chunks(
                call_id=call_id,
                text=transcript_text,
                metadata={
                    "date": date_str,
                    "internal_number": (call.get("internal_number") or ""),
                },
            )
            logger.info("RAG index: call_id=%s date=%s internal_number=%s chunks=%s", call_id, date_str, call.get("internal_number") or "", n_chunks)
        except Exception as e_vec:
            logger.warning("RAG index skipped for call_id=%s: %s", call_id, e_vec)
        
        # Step 6: AI Evaluation
        print(f"=== [TRANSCRIPTION] Starting AI evaluation... ===")
        try:
            direction_for_eval = call.get("direction", "Входящий")
            evaluation_results = evaluate_call(transcript_text, direction_for_eval)
            evaluation_results["call_id"] = call_id
            storage.add_evaluation(evaluation_results)
            print(f"=== [TRANSCRIPTION] Evaluation saved (Value: {evaluation_results.get('value_score')}, Manager: {evaluation_results.get('manager_score')}) ===")
        except Exception as e_eval:
            print(f"=== [TRANSCRIPTION] WARN: Error during evaluation: {e_eval} ===")
            import traceback
            traceback.print_exc()
        
        print(f"=== [TRANSCRIPTION] Process completed successfully ===")
        
        return {
            "success": True,
            "message": "Transcription completed",
            "transcript_id": transcript_id,
            "summary": summary,
        }
    
    except Exception as e:
        print(f"=== [TRANSCRIPTION] EXCEPTION: {str(e)} ===")
        import traceback
        traceback.print_exc()
        raise

