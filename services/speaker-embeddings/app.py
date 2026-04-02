import io
import json
import logging
import os
import threading
import warnings
from contextlib import asynccontextmanager
from typing import Any

import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
import uvicorn


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("speaker-embeddings")

# Размерность гибридных эмбеддингов: 512 (pyannote) + 30 (acoustic)
HYBRID_EMBEDDING_DIM = 542

model: "HybridEmbeddingModel | None" = None
model_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await run_in_threadpool(_ensure_model_initialized_sync)
    yield


app = FastAPI(
    title="Speaker Embeddings API",
    description="Batch speaker embeddings for Titanet/WeSpeaker-like clustering.",
    version="1.0.0",
    lifespan=lifespan,
)


class HybridEmbeddingModel:
    def __init__(self) -> None:
        self._pyannote_embedder = None
        self._load_pyannote_embedder()

    def _load_pyannote_embedder(self) -> None:
        if os.getenv("ENABLE_PYANNOTE", "1").strip().lower() in {"0", "false", "no"}:
            logger.info("pyannote disabled by ENABLE_PYANNOTE")
            self._pyannote_embedder = None
            return

        try:
            import torch
            
            # Принудительно используем CPU
            os.environ["CUDA_VISIBLE_DEVICES"] = ""
            torch.set_num_threads(1)
            
            os.environ.setdefault("TORCHCODEC_DISABLE", "1")
            warnings.filterwarnings(
                "ignore",
                message=r".*libtorchcodec loading traceback.*",
            )
            warnings.filterwarnings(
                "ignore",
                module=r"torchcodec\..*",
            )
            from pyannote.audio import Model, Inference

            token = os.getenv("HF_TOKEN", "").strip() or None
            # Используем последнюю модель эмбеддингов (2024)
            model_name = os.getenv("PYANNOTE_MODEL", "pyannote/wespeaker-voxceleb-resnet34-LM").strip() or "pyannote/wespeaker-voxceleb-resnet34-LM"
            last_exc: Exception | None = None

            # Пробуем разные варианты инициализации
            init_attempts = []
            if token:
                init_attempts = [
                    {"use_auth_token": token},
                    {"token": token},
                    {}
                ]
            else:
                init_attempts = [{}]

            for kwargs in init_attempts:
                try:
                    # Правильный способ: сначала загружаем модель, потом создаем Inference
                    model = Model.from_pretrained(model_name, **kwargs)
                    self._pyannote_embedder = Inference(model, window="whole")
                    logger.info("pyannote embedder loaded on CPU: model=%s", model_name)
                    return
                except TypeError as exc:
                    last_exc = exc
                    continue
                except Exception as exc:
                    last_exc = exc
                    break

            raise RuntimeError(f"Failed to initialize pyannote inference: {last_exc}")
        except Exception as exc:
            self._pyannote_embedder = None
            logger.info("pyannote embedder unavailable, using acoustic fallback: %s", exc)

    @property
    def is_pyannote_loaded(self) -> bool:
        return self._pyannote_embedder is not None

    @staticmethod
    def _l2_normalize(vec: np.ndarray) -> np.ndarray:
        norm = float(np.linalg.norm(vec))
        if norm <= 1e-8:
            return vec
        return vec / norm

    @staticmethod
    def _slice(audio: np.ndarray, sr: int, start: float, end: float) -> np.ndarray:
        start_idx = max(0, int(start * sr))
        end_idx = max(start_idx + 1, int(end * sr))
        end_idx = min(end_idx, audio.shape[0])
        return audio[start_idx:end_idx].astype(np.float32, copy=False)

    def _pyannote_vector(self, audio_slice: np.ndarray, sr: int) -> np.ndarray:
        if self._pyannote_embedder is None:
            logger.debug("Pyannote embedder не загружен, возвращаем нули")
            return np.zeros(512, dtype=np.float32)
        
        if audio_slice.size < max(400, sr // 40):
            logger.debug(f"Аудио слайс слишком короткий: {audio_slice.size} samples")
            return np.zeros(512, dtype=np.float32)
        
        try:
            import torch
            
            # Проверяем входные данные
            if not np.isfinite(audio_slice).all():
                logger.warning("Аудио слайс содержит NaN или Inf значения")
                audio_slice = np.nan_to_num(audio_slice, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Нормализуем амплитуду если нужно
            max_val = np.abs(audio_slice).max()
            if max_val > 1.0:
                logger.debug(f"Нормализация аудио: max_val={max_val:.4f}")
                audio_slice = audio_slice / max_val
            
            # Конвертируем numpy в torch.Tensor
            waveform_tensor = torch.from_numpy(audio_slice).float()
            
            # Pyannote ожидает dict с torch.Tensor
            emb = self._pyannote_embedder(
                {"waveform": waveform_tensor.unsqueeze(0), "sample_rate": sr}
            )
            emb_np = np.asarray(emb, dtype=np.float32).reshape(-1)
            
            # Используем полную размерность (512)
            expected_dim = 512
            if emb_np.shape[0] != expected_dim:
                logger.warning(f"Неожиданная размерность эмбеддинга: {emb_np.shape[0]}, ожидалось {expected_dim}. Обрезаем/дополняем.")
                if emb_np.shape[0] > expected_dim:
                    emb_np = emb_np[:expected_dim]
                else:
                    emb_np = np.pad(emb_np, (0, expected_dim - emb_np.shape[0]), mode='constant')
            
            # Проверяем результат
            if not np.isfinite(emb_np).all():
                logger.error("Pyannote вернул NaN или Inf эмбеддинги!")
                return np.zeros(512, dtype=np.float32)
            
            # НЕ нормализуем! Pyannote эмбеддинги используем как есть
            # Нормализация будет применена к финальному hybrid вектору
            
            # Диагностика
            norm = float(np.linalg.norm(emb_np))
            nonzero = np.count_nonzero(emb_np)
            
            # Показываем первые несколько значений для диагностики
            sample_values = emb_np[:5].tolist()
            logger.info(
                f"Pyannote: dim={emb_np.shape[0]}, norm={norm:.4f}, "
                f"nonzero={nonzero}/{expected_dim}, "
                f"sample_values={[f'{v:.4f}' for v in sample_values]}"
            )
            
            return emb_np
        except Exception as e:
            logger.error(f"Ошибка в _pyannote_vector: {e}", exc_info=True)
            return np.zeros(512, dtype=np.float32)

    @staticmethod
    def _acoustic_vector(audio_slice: np.ndarray, sr: int) -> np.ndarray:
        if audio_slice.size < max(400, sr // 40):
            return np.zeros(30, dtype=np.float32)
        try:
            mfcc = librosa.feature.mfcc(y=audio_slice, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            try:
                f0 = librosa.yin(audio_slice, fmin=70, fmax=350, sr=sr)
                voiced = f0[np.isfinite(f0)]
                pitch_mean = np.array([float(np.mean(voiced)) if voiced.size else 0.0], dtype=np.float32)
                pitch_std = np.array([float(np.std(voiced)) if voiced.size else 0.0], dtype=np.float32)
            except Exception:
                pitch_mean = np.array([0.0], dtype=np.float32)
                pitch_std = np.array([0.0], dtype=np.float32)

            centroid = librosa.feature.spectral_centroid(y=audio_slice, sr=sr)
            rms = librosa.feature.rms(y=audio_slice)
            vec = np.concatenate(
                [
                    mfcc_mean,
                    mfcc_std,
                    pitch_mean,
                    pitch_std,
                    np.array([float(np.mean(centroid))], dtype=np.float32),
                    np.array([float(np.mean(rms))], dtype=np.float32),
                ]
            ).astype(np.float32)
            return vec
        except Exception:
            return np.zeros(30, dtype=np.float32)

    def embed_segments(
        self,
        audio: np.ndarray,
        sr: int,
        segments: list[dict[str, Any]],
    ) -> list[list[float]]:
        out: list[list[float]] = []
        
        logger.info(f"Начало генерации эмбеддингов для {len(segments)} сегментов")
        logger.info(f"Аудио: shape={audio.shape}, sr={sr}, duration={len(audio)/sr:.2f}s")
        logger.info(f"Pyannote загружена: {self._pyannote_embedder is not None}")
        
        for idx, seg in enumerate(segments):
            if not isinstance(seg, dict):
                raise ValueError("Each segment must be an object")
            try:
                start = float(seg.get("start", 0.0))
                end = float(seg.get("end", start))
            except (TypeError, ValueError) as exc:
                raise ValueError("Segment start/end must be numeric") from exc
            if end <= start:
                out.append([0.0] * 542)
                logger.warning(f"Сегмент {idx}: пустой (start={start}, end={end})")
                continue
            
            audio_slice = self._slice(audio, sr, start, end)
            logger.debug(f"Сегмент {idx}: start={start:.2f}s, end={end:.2f}s, slice_size={audio_slice.shape[0]}")
            
            p = self._pyannote_vector(audio_slice, sr)
            a = self._acoustic_vector(audio_slice, sr)
            
            # Диагностика векторов
            p_norm = float(np.linalg.norm(p))
            a_norm = float(np.linalg.norm(a))
            p_nonzero = np.count_nonzero(p)
            a_nonzero = np.count_nonzero(a)
            
            # Показываем первые значения для диагностики
            p_sample = p[:5].tolist() if p.size >= 5 else p.tolist()
            
            logger.info(
                f"Сегмент {idx}: pyannote_norm={p_norm:.4f} ({p_nonzero}/{p.shape[0]} nonzero), "
                f"acoustic_norm={a_norm:.4f} ({a_nonzero}/30 nonzero), "
                f"pyannote_sample={[f'{v:.4f}' for v in p_sample]}"
            )
            
            # КРИТИЧНО: Нормализуем каждый компонент ПЕРЕД конкатенацией
            # Даём больший вес pyannote (идентичность спикера) vs acoustic (тембр)
            # Соотношение 70% pyannote / 30% acoustic для лучшего разделения спикеров
            p_normalized = self._l2_normalize(p) * 0.7
            a_normalized = self._l2_normalize(a) * 0.3
            
            # Конкатенируем с весами
            merged = np.concatenate([p_normalized, a_normalized]).astype(np.float32)
            
            # Финальная нормализация всего вектора
            merged = self._l2_normalize(merged)
            
            merged_norm = float(np.linalg.norm(merged))
            logger.info(f"Сегмент {idx}: merged_norm={merged_norm:.4f}")
            
            out.append(merged.tolist())
        
        # Диагностика попарных расстояний
        if len(out) >= 2:
            distances = []
            for i in range(len(out)):
                for j in range(i + 1, len(out)):
                    # Косинусное расстояние
                    emb_i = np.array(out[i])
                    emb_j = np.array(out[j])
                    dot = float(np.dot(emb_i, emb_j))
                    dist = 1.0 - dot
                    distances.append(dist)
            
            if distances:
                avg_dist = np.mean(distances)
                min_dist = min(distances)
                max_dist = max(distances)
                logger.info(
                    f"Попарные расстояния: avg={avg_dist:.4f}, min={min_dist:.4f}, max={max_dist:.4f}"
                )
                
                if avg_dist < 0.01:
                    logger.error(
                        "КРИТИЧЕСКАЯ ПРОБЛЕМА: Эмбеддинги практически идентичны! "
                        "Проверьте работу pyannote модели."
                    )
        
        return out


def _ensure_model_initialized_sync() -> "HybridEmbeddingModel":
    global model
    with model_lock:
        if model is None:
            model = HybridEmbeddingModel()
    return model


def _get_model() -> HybridEmbeddingModel:
    return _ensure_model_initialized_sync()


def _process_embed_batch(audio_bytes: bytes, segments_json: str) -> dict[str, Any]:
    try:
        payload = json.loads(segments_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid segments_json: {exc}") from exc

    if isinstance(payload, list):
        segments = payload
    elif isinstance(payload, dict):
        segments = payload.get("segments", [])
    else:
        raise HTTPException(
            status_code=400,
            detail="segments_json must be a list or an object with 'segments' list",
        )

    if not isinstance(segments, list):
        raise HTTPException(status_code=400, detail="segments_json.segments must be a list")

    normalized_segments: list[dict[str, Any]] = []
    for idx, seg in enumerate(segments):
        if not isinstance(seg, dict):
            raise HTTPException(status_code=400, detail=f"segments[{idx}] must be an object")
        try:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=f"segments[{idx}] start/end must be numeric",
            ) from exc
        normalized_segments.append(
            {
                **seg,
                "start": start,
                "end": end,
            }
        )

    with io.BytesIO(audio_bytes) as buf:
        audio, sr = sf.read(buf, dtype="float32")
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)
        audio = np.asarray(audio, dtype=np.float32)

    if sr != 16000:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        sr = 16000

    try:
        embeddings = _get_model().embed_segments(audio, sr, normalized_segments)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "success": True,
        "embedding_dim": len(embeddings[0]) if embeddings else 0,
        "count": len(embeddings),
        "embeddings": embeddings,
    }


@app.post("/api/embed-batch")
async def embed_batch(
    file: UploadFile = File(...),
    segments_json: str = Form(...),
):
    try:
        audio_bytes = await file.read()
        return await run_in_threadpool(_process_embed_batch, audio_bytes, segments_json)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("embed-batch failed: %s", exc)
        raise HTTPException(status_code=500, detail="embed-batch failed") from exc


@app.get("/")
async def root() -> dict[str, Any]:
    """Корневой endpoint с информацией о сервисе"""
    return {
        "service": "Speaker Embeddings API",
        "version": "1.0.0",
        "description": "Batch speaker embeddings for speaker diarization",
        "endpoints": {
            "/": "GET - Информация о сервисе",
            "/health": "GET - Health check",
            "/api/diagnostics": "GET - Диагностическая информация",
            "/api/embed-batch": "POST - Генерация эмбеддингов для сегментов"
        },
        "docs": "/docs",
        "embedding_dim": 222,
        "components": {
            "pyannote": 192,
            "acoustic": 30
        }
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    current_model = await run_in_threadpool(_ensure_model_initialized_sync)
    return {
        "status": "healthy",
        "pyannote_loaded": current_model.is_pyannote_loaded if current_model else False,
    }


@app.get("/api/diagnostics")
async def diagnostics() -> dict[str, Any]:
    """Диагностическая информация о сервисе"""
    current_model = await run_in_threadpool(_ensure_model_initialized_sync)
    
    return {
        "service": "speaker-embeddings",
        "version": "1.0.0",
        "pyannote": {
            "loaded": current_model.is_pyannote_loaded if current_model else False,
            "model": os.getenv("PYANNOTE_MODEL", "pyannote/wespeaker-voxceleb-resnet34-LM"),
            "enabled": os.getenv("ENABLE_PYANNOTE", "1"),
        },
        "config": {
            "hf_token_set": bool(os.getenv("HF_TOKEN", "").strip()),
            "port": os.getenv("PORT", "7860"),
        },
        "embedding_dim": 542,
        "components": {
            "pyannote": 512,
            "acoustic": 30
        }
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
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000
        
        # Выполняем диаризацию
        result = await run_in_threadpool(
            _process_diarization,
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
    current_model = _get_model()
    
    if not current_model.is_pyannote_loaded:
        raise HTTPException(
            status_code=503,
            detail="Pyannote model not loaded. Check HF_TOKEN and model configuration."
        )
    
    try:
        import torch
        from pyannote.audio import Pipeline
        
        # Загружаем pyannote diarization pipeline
        token = os.getenv("HF_TOKEN", "").strip() or None
        # Используем последнюю community модель (сентябрь 2025)
        diarization_model = os.getenv(
            "PYANNOTE_DIARIZATION_MODEL",
            "pyannote/speaker-diarization-community-1"
        )
        
        # Пробуем загрузить pipeline
        pipeline = None
        init_attempts = []
        if token:
            init_attempts = [
                {"use_auth_token": token},
                {"token": token},
                {}
            ]
        else:
            init_attempts = [{}]
        
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
