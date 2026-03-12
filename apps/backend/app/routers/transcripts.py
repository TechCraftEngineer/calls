"""Transcripts router."""

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam, Query, Response
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import json
import io

from app.models.schemas import TranscriptResponse
from app.services.storage import SQLiteStorage
from app.services.transcription import transcribe_call
from app.dependencies import get_storage, get_current_user
from app.routers.utils import format_transcript_text, RECORDS_DIR

router = APIRouter()


@router.post("/calls/{call_id}/transcribe")
async def transcribe_call_endpoint(
    call_id: int = PathParam(..., ge=1),
    model: Optional[str] = Query("assemblyai", description="Transcription model: 'assemblyai' or 'salutespeech'"),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Start transcription for a call."""
    # Validate model parameter
    if model not in ["assemblyai", "salutespeech"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid model. Must be 'assemblyai' or 'salutespeech'"
        )
    
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    filename = call.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="No filename specified for call")
    
    audio_path = RECORDS_DIR / filename
    print(f"=== [TRANSCRIBE_ENDPOINT] Call ID: {call_id}, Model: {model} ===")
    print(f"=== [TRANSCRIBE_ENDPOINT] RECORDS_DIR: {RECORDS_DIR.absolute()} ===")
    print(f"=== [TRANSCRIBE_ENDPOINT] Filename: {filename} ===")
    print(f"=== [TRANSCRIBE_ENDPOINT] Full path: {audio_path.absolute()} ===")
    print(f"=== [TRANSCRIBE_ENDPOINT] File exists: {audio_path.exists()} ===")
    
    if not audio_path.exists():
        # Попробуем найти файл в других возможных местах
        possible_paths = [
            Path(__file__).parent.parent.parent.parent / "records" / filename,
            Path("records") / filename,
            Path("../records") / filename,
        ]
        print(f"=== [TRANSCRIBE_ENDPOINT] Trying alternative paths: ===")
        for alt_path in possible_paths:
            print(f"  - {alt_path.absolute()}: {alt_path.exists()}")
            if alt_path.exists():
                audio_path = alt_path
                print(f"=== [TRANSCRIBE_ENDPOINT] Found file at: {audio_path.absolute()} ===")
                break
        else:
            error_msg = f"Audio file not found: {audio_path.absolute()}. RECORDS_DIR: {RECORDS_DIR.absolute()}"
            print(f"=== [TRANSCRIBE_ENDPOINT] ERROR: {error_msg} ===")
            raise HTTPException(status_code=404, detail=error_msg)
    
    try:
        result = await transcribe_call(call_id, storage, model=model)
        storage.add_activity_log(
            "info",
            f"Transcription completed for call #{call_id} using {model}",
            current_user.get("username", "system")
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get transcript for a call."""
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    return transcript


@router.delete("/calls/{call_id}/transcript")
async def delete_transcript(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Delete transcript for a call."""
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    deleted = storage.delete_transcript(transcript["id"])
    if deleted:
        try:
            from app.services.vector_db import delete_by_call_id
            delete_by_call_id(call_id)
        except Exception:
            pass
        storage.add_activity_log(
            "info",
            f"Transcript deleted for call #{call_id}",
            current_user.get("username", "system")
        )
        return {"success": True, "message": f"Transcript for call #{call_id} deleted"}
    
    raise HTTPException(status_code=500, detail="Failed to delete transcript")


@router.get("/calls/{call_id}/transcript/download")
async def download_transcript(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Download transcript as text file."""
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    filename = f"transcript_call_{call_id}.txt"
    text_to_download = transcript.get("formatted_text") or transcript.get("text", "")
    if not text_to_download:
        text_to_download = format_transcript_text(transcript.get("text", ""))
    
    return Response(
        content=text_to_download.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/calls/{call_id}/transcript/preview")
async def preview_transcript(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Preview transcript (JSON)."""
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    return {
        "id": transcript["id"],
        "title": transcript.get("title"),
        "text": transcript.get("text"),
        "sentiment": transcript.get("sentiment"),
        "confidence": transcript.get("confidence"),
    }


@router.get("/calls/{call_id}/assemblyai-response")
async def get_assemblyai_response(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get AssemblyAI raw response as readable dialog."""
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    filename = call.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="No filename specified")
    
    try:
        audio_path = RECORDS_DIR / filename
        audio_stem = audio_path.stem
        response_file = audio_path.parent / "assemblyai_responses" / f"{audio_stem}_response.json"
        
        if not response_file.exists():
            raise HTTPException(status_code=404, detail="AssemblyAI response not found")
        
        with open(response_file, 'r', encoding='utf-8') as f:
            response_data = json.load(f)
        
        utterances = response_data.get('utterances', [])
        if not utterances:
            raise HTTPException(status_code=400, detail="No speaker data in response")
        
        formatted_lines = []
        for utt in utterances:
            speaker_label = utt.get('speaker', 'Unknown')
            text = utt.get('text', '')
            if text:
                formatted_lines.append(f"speaker {speaker_label}: {text}")
        
        dialog_text = "\n\n".join(formatted_lines)
        
        return {
            "success": True,
            "dialog": dialog_text,
            "utterances_count": len(utterances)
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON decode error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

