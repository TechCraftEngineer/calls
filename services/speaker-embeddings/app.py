import io
import logging
import os
from typing import Any

import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
import uvicorn


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("speaker-embeddings")


app = FastAPI(
    title="Speaker Diarization API",
    description="Speaker diarization service using pyannote.audio",
    version="2.0.0",
)


@app.get("/")
async def root() -> dict[str, Any]:
    """Корневой endpoint с информацией о сервисе"""
    return {
        "service": "Speaker Diarization API",
        "version": "2.0.0",
        "description": "Speaker diarization using pyannote.audio 4.x",
        "endpoints": {
            "/": "GET - Информация о сервисе",
            "/health": "GET - Health check",
            "/api/diagnostics": "GET - Диагностическая информация",
            "/api/diarize": "POST - Speaker diarization"
        },
        "docs": "/docs",
        "models": {
            "diarization": os.getenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/speaker-diarization-community-1"),
        }
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint"""
    # Проверяем что pyannote доступен
    pyannote_available = False
    try:
        from pyannote.audio import Pipeline
        token = os.getenv("HF_TOKEN", "").strip() or None
        if token:
            pyannote_available = True
    except Exception:
        pass
    
    return {
        "status": "healthy",
        "pyannote_available": pyannote_available,
        "hf_token_set": bool(os.getenv("HF_TOKEN", "").strip()),
    }


@app.get("/api/diagnostics")
async def diagnostics() -> dict[str, Any]:
    """Диагностическая информация о сервисе"""
    return {
        "service": "speaker-diarization",
        "version": "2.0.0",
        "pyannote": {
            "diarization_model": os.getenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/speaker-diarization-community-1"),
            "hf_token_set": bool(os.getenv("HF_TOKEN", "").strip()),
        },
        "config": {
            "port": os.getenv("PORT", "7860"),
        },
    }


@app.post("/api/diarize")
async def diarize(
    file: UploadFile = File(...),
    num_speakers: int | None = Form(None),
    min_speakers: int | None = Form(None),
    max_speakers: int | None = Form(None),
):
    """
    Speaker diarization endpoint.
    
    Определяет "кто говорил когда" в аудио файле.
    Возвращает список сегментов с временными метками и ID спикеров.
    """
    try:
        audio_bytes = await file.read()
        
        # Загружаем аудио
        with io.BytesIO(audio_bytes) as buf:
            audio, sr = sf.read(buf, dtype="float32")
            if audio.ndim > 1:
                audio = np.mean(audio, axis=1)
            audio = np.asarray(audio, dtype=np.float32)
        
        # Ресемплируем если нужно
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000
        
        # Выполняем диаризацию
        result = _process_diarization(
            audio,
            sr,
            num_speakers,
            min_speakers,
            max_speakers,
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("diarization failed: %s", exc)
        raise HTTPException(status_code=500, detail="diarization failed") from exc


def _process_diarization(
    audio: np.ndarray,
    sr: int,
    num_speakers: int | None,
    min_speakers: int | None,
    max_speakers: int | None,
) -> dict[str, Any]:
    """Выполнение диаризации с использованием pyannote."""
    
    try:
        import torch
        from pyannote.audio import Pipeline
        
        # Загружаем pyannote diarization pipeline
        token = os.getenv("HF_TOKEN", "").strip() or None
        if not token:
            raise HTTPException(
                status_code=503,
                detail="HF_TOKEN not configured. Set HF_TOKEN environment variable."
            )
        
        # Используем последнюю community модель (сентябрь 2025)
        diarization_model = os.getenv(
            "PYANNOTE_DIARIZATION_MODEL",
            "pyannote/speaker-diarization-community-1"
        )
        
        # Пробуем загрузить pipeline
        pipeline = None
        init_attempts = [
            {"use_auth_token": token},
            {"token": token},
        ]
        
        for kwargs in init_attempts:
            try:
                pipeline = Pipeline.from_pretrained(diarization_model, **kwargs)
                break
            except TypeError:
                continue
            except Exception as exc:
                logger.error(f"Failed to load diarization pipeline: {exc}")
                break
        
        if pipeline is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to load pyannote diarization pipeline"
            )
        
        # Подготовка аудио для pyannote
        waveform = torch.from_numpy(audio).float()
        if waveform.ndim == 1:
            waveform = waveform.unsqueeze(0)
        
        audio_dict = {
            "waveform": waveform,
            "sample_rate": sr,
        }
        
        # Параметры диаризации
        diarization_params = {}
        if num_speakers is not None:
            diarization_params["num_speakers"] = num_speakers
        if min_speakers is not None:
            diarization_params["min_speakers"] = min_speakers
        if max_speakers is not None:
            diarization_params["max_speakers"] = max_speakers
        
        logger.info(
            f"Starting diarization: duration={len(audio)/sr:.2f}s, params={diarization_params}"
        )
        
        # Выполнение диаризации
        diarization = pipeline(audio_dict, **diarization_params)
        
        # Конвертация результатов (новый API pyannote 4.x)
        segments = []
        
        logger.info(f"Diarization output type: {type(diarization)}")
        
        # DiarizeOutput в pyannote 4.x имеет атрибут speaker_diarization (Annotation объект)
        try:
            # Извлекаем Annotation из DiarizeOutput
            annotation = None
            
            if hasattr(diarization, 'speaker_diarization'):
                # Новый API (pyannote 4.x) - используем speaker_diarization
                annotation = diarization.speaker_diarization
                logger.info(f"Using speaker_diarization, type: {type(annotation)}")
            elif hasattr(diarization, 'itertracks'):
                # Старый API (pyannote < 4.0) - diarization это уже Annotation
                annotation = diarization
                logger.info(f"Using diarization directly as Annotation")
            else:
                raise ValueError(f"Cannot extract annotation from {type(diarization)}")
            
            # Теперь итерируем по Annotation
            if hasattr(annotation, 'itertracks'):
                for segment, _, label in annotation.itertracks(yield_label=True):
                    segments.append({
                        "start": float(segment.start),
                        "end": float(segment.end),
                        "speaker": label,
                    })
            else:
                raise ValueError(f"Annotation has no itertracks method: {type(annotation)}")
        
        except Exception as e:
            logger.error(f"Failed to extract segments: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract diarization segments: {str(e)}"
            )
        
        if not segments:
            raise HTTPException(
                status_code=500,
                detail="Diarization returned no segments"
            )
        
        # Сортировка по времени
        segments.sort(key=lambda s: s["start"])
        
        # Статистика
        unique_speakers = set(s["speaker"] for s in segments)
        total_duration = sum(s["end"] - s["start"] for s in segments)
        
        logger.info(
            f"Diarization completed: {len(segments)} segments, "
            f"{len(unique_speakers)} speakers, "
            f"total_speech={total_duration:.2f}s"
        )
        
        return {
            "success": True,
            "segments": segments,
            "num_speakers": len(unique_speakers),
            "speakers": sorted(unique_speakers),
            "total_speech_duration": total_duration,
            "audio_duration": len(audio) / sr,
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Diarization error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Diarization failed: {str(exc)}"
        ) from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
