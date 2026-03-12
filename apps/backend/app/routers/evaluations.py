"""Evaluations router."""

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam
from app.models.schemas import EvaluationResponse
from app.services.storage import SQLiteStorage
from app.services.deepseek import evaluate_call
from app.dependencies import get_storage, get_current_user

router = APIRouter()


@router.post("/calls/{call_id}/evaluate", response_model=EvaluationResponse, response_model_by_alias=False)
async def evaluate_call_endpoint(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Run AI evaluation for a call."""
    print(f"\n=== [EVALUATION] Request started for Call ID: {call_id} ===")
    
    call = storage.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    transcript = storage.get_transcript_by_call_id(call_id)
    if not transcript or not transcript.get("text"):
        raise HTTPException(
            status_code=400,
            detail="Transcript not found. Please transcribe the call first."
        )
    
    try:
        text_to_analyze = transcript.get("formatted_text") or transcript.get("text")
        direction = call.get("direction", "Входящий")
        print(f"=== [EVALUATION] Analyzing value and quality... Direction: {direction} ===")
        
        evaluation_results = evaluate_call(text_to_analyze, direction)
        evaluation_results["call_id"] = call_id
        
        print(f"=== [EVALUATION] Saving results: {evaluation_results} ===")
        storage.add_evaluation(evaluation_results)
        
        storage.add_activity_log(
            "info",
            f"Evaluation completed for call #{call_id}",
            current_user.get("username", "system")
        )
        
        # Явно создаем EvaluationResponse для правильной сериализации
        # Убеждаемся, что все поля имеют правильные типы
        try:
            return EvaluationResponse(**evaluation_results)
        except Exception as model_error:
            print(f"=== [EVALUATION] Error creating EvaluationResponse: {model_error} ===")
            print(f"=== [EVALUATION] evaluation_results: {evaluation_results} ===")
            # Если не удалось создать модель, возвращаем словарь напрямую
            # FastAPI попытается сериализовать его автоматически
            return evaluation_results
    
    except Exception as e:
        print(f"=== [EVALUATION] Error: {e} ===")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/evaluation", response_model=EvaluationResponse, response_model_by_alias=False)
async def get_evaluation(
    call_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get evaluation for a call."""
    evaluation = storage.get_evaluation(call_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Явно создаем EvaluationResponse для правильной сериализации
    # Убеждаемся, что все поля имеют правильные типы
    try:
        return EvaluationResponse(**evaluation)
    except Exception as model_error:
        print(f"=== [EVALUATION] Error creating EvaluationResponse from DB: {model_error} ===")
        print(f"=== [EVALUATION] evaluation: {evaluation} ===")
        # Если не удалось создать модель, возвращаем словарь напрямую
        return evaluation

