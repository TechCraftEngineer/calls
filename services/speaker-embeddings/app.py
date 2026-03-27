import io
import json
import logging
import os
import asyncio
import threading
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

model: "HybridEmbeddingModel | None" = None
model_lock = asyncio.Lock()
thread_model_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model
    async with model_lock:
        if model is None:
            model = await run_in_threadpool(HybridEmbeddingModel)
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
        try:
            from pyannote.audio import Inference
            import os

            token = os.getenv("HF_TOKEN", "").strip() or None
            self._pyannote_embedder = Inference(
                "pyannote/embedding",
                use_auth_token=token,
            )
            logger.info("pyannote/embedding loaded")
        except Exception as exc:
            self._pyannote_embedder = None
            logger.warning("pyannote embedder unavailable: %s", exc)

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
        if self._pyannote_embedder is None or audio_slice.size < max(400, sr // 40):
            return np.zeros(192, dtype=np.float32)
        try:
            emb = self._pyannote_embedder(
                {"waveform": audio_slice[None, :], "sample_rate": sr}
            )
            return self._l2_normalize(np.asarray(emb, dtype=np.float32).reshape(-1))
        except Exception:
            return np.zeros(192, dtype=np.float32)

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
        for seg in segments:
            if not isinstance(seg, dict):
                raise ValueError("Each segment must be an object")
            try:
                start = float(seg.get("start", 0.0))
                end = float(seg.get("end", start))
            except (TypeError, ValueError) as exc:
                raise ValueError("Segment start/end must be numeric") from exc
            if end <= start:
                out.append([0.0] * 222)
                continue
            audio_slice = self._slice(audio, sr, start, end)
            p = self._pyannote_vector(audio_slice, sr)
            a = self._acoustic_vector(audio_slice, sr)
            merged = self._l2_normalize(np.concatenate([p, a]).astype(np.float32))
            out.append(merged.tolist())
        return out


def _get_model() -> HybridEmbeddingModel:
    global model
    with thread_model_lock:
        if model is None:
            model = HybridEmbeddingModel()
    return model


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


@app.get("/health")
async def health() -> dict[str, Any]:
    current_model = model
    return {
        "status": "healthy",
        "pyannote_loaded": current_model.is_pyannote_loaded if current_model else False,
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
