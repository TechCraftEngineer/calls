from __future__ import annotations

import io
import json
import logging
import os
from typing import Any

import librosa
import numpy as np
import requests
import soundfile as sf
from config import settings

logger = logging.getLogger(__name__)
HYBRID_EMBEDDING_DIM = 222


class EmbeddingService:
    """
    Hybrid Titanet+WeSpeaker-style эмбеддинг:
    - primary: pyannote speaker embedding (как замена Titanet-подобного пространства),
    - secondary: MFCC+pitch статистики (как легковесный WeSpeaker-style бэкап),
    - output: L2-normalized concatenation.
    """

    def __init__(self) -> None:
        env = (
            os.getenv("APP_ENV")
            or os.getenv("ENV")
            or os.getenv("ENVIRONMENT")
            or ""
        ).strip().lower()
        self._warn_in_production = env in {"prod", "production"}
        self._pyannote_embedder = None
        self._remote_url = settings.speaker_embeddings_url.strip().rstrip("/")
        self._remote_timeout = settings.speaker_embeddings_timeout
        self._load_pyannote_embedder()
        if self._warn_in_production and self._pyannote_embedder is None:
            logger.warning(
                "EmbeddingService работает без pyannote embedding модели; "
                "качество speaker clustering будет ниже."
            )

    def _load_pyannote_embedder(self) -> None:
        try:
            from pyannote.audio import Model, Inference

            token = os.getenv("HF_TOKEN", "").strip() or None
            
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

            last_exc = None
            for kwargs in init_attempts:
                try:
                    # Правильный способ: сначала загружаем модель, потом создаем Inference
                    model = Model.from_pretrained("pyannote/embedding", **kwargs)
                    self._pyannote_embedder = Inference(model, window="whole")
                    logger.info("Pyannote speaker embedder загружен")
                    return
                except TypeError as exc:
                    last_exc = exc
                    continue
                except Exception as exc:
                    last_exc = exc
                    break
            
            raise RuntimeError(f"Failed to initialize pyannote: {last_exc}")
        except Exception as exc:
            self._pyannote_embedder = None
            logger.warning(
                "Pyannote speaker embedder недоступен (%s): %s",
                type(exc).__name__,
                exc,
            )

    def _try_remote_embeddings(
        self,
        segments: list[dict[str, Any]],
        audio: np.ndarray,
        sample_rate: int,
    ) -> list[list[float]] | None:
        if not self._remote_url:
            return None
        try:
            payload = {
                "segments": [
                    {
                        "start": float(seg.get("start", 0.0)),
                        "end": float(seg.get("end", seg.get("start", 0.0))),
                        "text": str(seg.get("text", "")),
                    }
                    for seg in segments
                ]
            }
            with io.BytesIO() as wav_buffer:
                sf.write(
                    wav_buffer,
                    audio.astype(np.float32),
                    sample_rate,
                    format="WAV",
                    subtype="PCM_16",
                )
                wav_bytes = wav_buffer.getvalue()

            response = requests.post(
                f"{self._remote_url}/api/embed-batch",
                files={"file": ("audio.wav", wav_bytes, "audio/wav")},
                data={"segments_json": json.dumps(payload, ensure_ascii=False)},
                timeout=self._remote_timeout,
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings")
            if not isinstance(embeddings, list):
                return None
            parsed: list[list[float]] = []
            for emb in embeddings:
                if not isinstance(emb, list):
                    logger.warning("Remote embedding has invalid type: %s", type(emb).__name__)
                    return None
                parsed_emb = [float(v) for v in emb]
                if len(parsed_emb) != HYBRID_EMBEDDING_DIM:
                    logger.warning(
                        "Remote embedding dimension mismatch: %s != %s",
                        len(parsed_emb),
                        HYBRID_EMBEDDING_DIM,
                    )
                    return None
                parsed.append(parsed_emb)
            if len(parsed) != len(segments):
                logger.warning("Remote embedding size mismatch: %s != %s", len(parsed), len(segments))
                return None
            return parsed
        except Exception as exc:
            logger.warning("Remote embeddings unavailable, fallback to local: %s", exc)
            return None

    @staticmethod
    def _l2_normalize(vec: np.ndarray) -> np.ndarray:
        norm = float(np.linalg.norm(vec))
        if norm <= 1e-8:
            return vec
        return vec / norm

    @staticmethod
    def _extract_audio_slice(
        audio: np.ndarray,
        sr: int,
        start: float,
        end: float,
    ) -> np.ndarray:
        if sr <= 0:
            return np.array([], dtype=np.float32)
        start_idx = max(0, int(start * sr))
        end_idx = max(start_idx + 1, int(end * sr))
        end_idx = min(end_idx, audio.shape[0])
        return audio[start_idx:end_idx].astype(np.float32, copy=False)

    def _pyannote_vector(self, audio_slice: np.ndarray, sr: int) -> np.ndarray:
        if self._pyannote_embedder is None or audio_slice.size < max(400, sr // 40):
            return np.zeros(192, dtype=np.float32)
        try:
            import torch
            
            # Конвертируем numpy в torch.Tensor для pyannote
            waveform_tensor = torch.from_numpy(audio_slice).float()
            
            emb = self._pyannote_embedder(
                {"waveform": waveform_tensor.unsqueeze(0), "sample_rate": sr}
            )
            emb_np = np.asarray(emb, dtype=np.float32).reshape(-1)
            return self._l2_normalize(emb_np)
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
                f0 = librosa.yin(
                    audio_slice,
                    fmin=70,
                    fmax=350,
                    sr=sr,
                )
                voiced = f0[np.isfinite(f0)]
                pitch_mean = np.array(
                    [float(np.mean(voiced)) if voiced.size else 0.0],
                    dtype=np.float32,
                )
                pitch_std = np.array(
                    [float(np.std(voiced)) if voiced.size else 0.0],
                    dtype=np.float32,
                )
            except Exception:
                pitch_mean = np.array([0.0], dtype=np.float32)
                pitch_std = np.array([0.0], dtype=np.float32)

            spectral_centroid = librosa.feature.spectral_centroid(
                y=audio_slice, sr=sr
            )
            centroid_mean = np.array(
                [float(np.mean(spectral_centroid))], dtype=np.float32
            )
            rms = librosa.feature.rms(y=audio_slice)
            rms_mean = np.array([float(np.mean(rms))], dtype=np.float32)

            vec = np.concatenate(
                [mfcc_mean, mfcc_std, pitch_mean, pitch_std, centroid_mean, rms_mean]
            ).astype(np.float32)
            return vec
        except Exception:
            return np.zeros(30, dtype=np.float32)

    def build_hybrid_embedding(
        self,
        segment: dict[str, Any],
        audio: np.ndarray | None = None,
        sample_rate: int | None = None,
    ) -> list[float]:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        if (
            audio is None
            or sample_rate is None
            or sample_rate <= 0
            or audio.size == 0
            or end <= start
        ):
            return [0.0] * HYBRID_EMBEDDING_DIM

        audio_slice = self._extract_audio_slice(audio, sample_rate, start, end)
        pyannote_vec = self._pyannote_vector(audio_slice, sample_rate)
        acoustic_vec = self._acoustic_vector(audio_slice, sample_rate)
        merged = np.concatenate([pyannote_vec, acoustic_vec]).astype(np.float32)
        merged = self._l2_normalize(merged)
        return merged.tolist()

    def build_batch_hybrid_embeddings(
        self,
        segments: list[dict[str, Any]],
        audio: np.ndarray,
        sample_rate: int,
    ) -> list[list[float]]:
        if not segments:
            return []

        # Приоритет: сначала пробуем remote сервис, потом локальную pyannote
        remote_embeddings = self._try_remote_embeddings(segments, audio, sample_rate)
        if remote_embeddings is not None:
            logger.info(f"Использованы remote эмбеддинги для {len(segments)} сегментов")
            return remote_embeddings

        # Fallback на локальную генерацию
        logger.info(
            f"Генерация локальных эмбеддингов для {len(segments)} сегментов "
            f"(pyannote={'loaded' if self._pyannote_embedder else 'not loaded'}, remote unavailable)"
        )
        
        embeddings = [
            self.build_hybrid_embedding(
                segment,
                audio=audio,
                sample_rate=sample_rate,
            )
            for segment in segments
        ]
        
        # Диагностика качества эмбеддингов
        if embeddings:
            norms = [float(np.linalg.norm(emb)) for emb in embeddings]
            avg_norm = np.mean(norms)
            logger.info(
                f"Эмбеддинги сгенерированы: avg_norm={avg_norm:.4f}, "
                f"min_norm={min(norms):.4f}, max_norm={max(norms):.4f}"
            )
            
            # Вычисляем попарные расстояния для диагностики
            if len(embeddings) >= 2:
                from services.clustering_service import ClusteringService
                distances = []
                for i in range(len(embeddings)):
                    for j in range(i + 1, len(embeddings)):
                        dist = ClusteringService._cosine_distance(embeddings[i], embeddings[j])
                        distances.append(dist)
                
                if distances:
                    avg_dist = np.mean(distances)
                    logger.info(
                        f"Попарные расстояния: avg={avg_dist:.4f}, "
                        f"min={min(distances):.4f}, max={max(distances):.4f}"
                    )
        
        return embeddings
