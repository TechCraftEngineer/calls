from __future__ import annotations

import json
import logging
import queue
import threading
import uuid
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import librosa
import numpy as np
import requests
from config import settings
from services.alignment_service import AlignmentService
from services.attribution_service import AttributionService
from services.clustering_service import ClusteringService
from services.embedding_service import EmbeddingService
from services.job_models import JobRecord, JobStatus, PipelineStage
from services.postprocess_service import PostprocessService
from services.transcription_service import transcription_service

logger = logging.getLogger(__name__)


class PermanentAudioError(Exception):
    """Non-retryable error for missing/corrupt audio files."""
    pass


class JobOrchestrator:
    def __init__(self) -> None:
        self.jobs: dict[str, JobRecord] = {}
        self._queue: queue.Queue[str] = queue.Queue()
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._worker = threading.Thread(target=self._run_worker, daemon=True)
        self.jobs_dir = Path(settings.jobs_dir)
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

        self.alignment = AlignmentService()
        self.postprocess = PostprocessService()
        self.embedding = EmbeddingService()
        self.clustering = ClusteringService()
        self.attribution = AttributionService()

        self._worker.start()

    @staticmethod
    def _safe_unlink(path: str | None) -> None:
        if not path:
            return
        try:
            Path(path).unlink(missing_ok=True)
        except Exception:
            logger.warning("Failed to cleanup file: %s", path)

    def create_job(
        self,
        input_path: str,
        original_filename: str,
        callback_url: str | None = None,
        preprocess_metadata: dict[str, Any] | None = None,
    ) -> JobRecord:
        job_id = str(uuid.uuid4())
        metadata: dict[str, Any] = {"pipeline_version": "ultra-sota-2026", "attempt": 0}
        if callback_url:
            metadata["callback_url"] = callback_url
        if preprocess_metadata is not None:
            metadata["preprocess_metadata"] = preprocess_metadata
        job = JobRecord(
            job_id=job_id,
            input_path=input_path,
            original_filename=original_filename,
            metadata=metadata,
        )
        with self._lock:
            self._persist_job(job)
            self.jobs[job_id] = job
            self._queue.put(job_id)
        return job

    def get_job(self, job_id: str) -> JobRecord | None:
        with self._lock:
            return self.jobs.get(job_id)

    def list_jobs(
        self,
        limit: int = 50,
        offset: int = 0,
        status: JobStatus | None = None,
    ) -> list[JobRecord]:
        with self._lock:
            items = sorted(self.jobs.values(), key=lambda x: x.created_at, reverse=True)
            if status is not None:
                items = [item for item in items if item.status == status]
            offset = max(0, offset)
            limit = max(1, limit)
            return items[offset : offset + limit]

    def cancel_job(self, job_id: str) -> bool:
        with self._lock:
            job = self.jobs.get(job_id)
            if not job or job.status in {JobStatus.done, JobStatus.failed, JobStatus.cancelled}:
                return False
            job.status = JobStatus.cancelled
            job.updated_at = datetime.now(timezone.utc).isoformat()
            self._persist_job(job)
            # Копируем данные для callback перед выходом из блокировки
            job_copy = asdict(job)
        # Вызываем callback вне блокировки
        self._send_callback(JobRecord(**job_copy))
        return True

    def cleanup_old_jobs(self) -> None:
        ttl = timedelta(hours=settings.job_ttl_hours)
        now = datetime.now(timezone.utc)
        with self._lock:
            to_delete = []
            for job_id, job in self.jobs.items():
                ts = datetime.fromisoformat(job.updated_at)
                if now - ts > ttl:
                    to_delete.append(job_id)
            for job_id in to_delete:
                self.jobs.pop(job_id, None)
                try:
                    (self.jobs_dir / f"{job_id}.json").unlink(missing_ok=True)
                except Exception:
                    logger.warning("Failed to remove stale job file: %s", job_id)

    def _set_stage(self, job: JobRecord, name: str, status: str, details: dict[str, Any] | None = None) -> None:
        for stage in job.stages:
            if stage.name == name:
                now = datetime.now(timezone.utc).isoformat()
                if status == "running" and not stage.started_at:
                    stage.started_at = now
                if status in {"done", "failed"}:
                    stage.finished_at = now
                stage.status = status
                if details:
                    stage.details.update(details)
                break

    def _persist_job(self, job: JobRecord) -> None:
        payload = asdict(job)
        payload["status"] = job.status.value
        for stage in payload["stages"]:
            if isinstance(stage, PipelineStage):
                stage["name"] = stage.name
        out = self.jobs_dir / f"{job.job_id}.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _run_worker(self) -> None:
        while not self._stop.is_set():
            try:
                job_id = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue
            with self._lock:
                job = self.jobs.get(job_id)
            if not job or job.status == JobStatus.cancelled:
                self._queue.task_done()
                continue

            try:
                self._process_job(job)
            except PermanentAudioError as exc:
                # Non-retryable error - fail immediately
                logger.error("Permanent audio error, failing job: %s", job.job_id)
                with self._lock:
                    job.status = JobStatus.failed
                    job.error = str(exc)
                    job.updated_at = datetime.now(timezone.utc).isoformat()
                    self._persist_job(job)
                    # Копируем данные для callback перед выходом из блокировки
                    job_copy = asdict(job)
                    input_path = job.input_path
                # Вызываем callback и удаляем файл вне блокировки
                self._send_callback(JobRecord(**job_copy))
                self._safe_unlink(input_path)
            except Exception as exc:
                logger.exception("Job failed: %s", job.job_id)
                with self._lock:
                    current_attempt = int(job.metadata.get("attempt", 0))
                    if current_attempt < settings.max_job_retries and job.status != JobStatus.cancelled:
                        job.metadata["attempt"] = current_attempt + 1
                        job.status = JobStatus.queued
                        job.error = f"Attempt {current_attempt + 1} failed: {exc}"
                        job.updated_at = datetime.now(timezone.utc).isoformat()
                        self._persist_job(job)
                        self._queue.put(job.job_id)
                    else:
                        job.status = JobStatus.failed
                        job.error = str(exc)
                        job.updated_at = datetime.now(timezone.utc).isoformat()
                        self._persist_job(job)
                        # Копируем данные для callback перед выходом из блокировки
                        job_copy = asdict(job)
                        input_path = job.input_path
                # Вызываем callback и удаляем файл вне блокировки
                self._send_callback(JobRecord(**job_copy))
                self._safe_unlink(input_path)
            finally:
                self._queue.task_done()

    def _process_job(self, job: JobRecord) -> None:
        # Препроцесс (audio-enhancer) выполняется во внешнем оркестраторе (Inngest); метаданные — в job.metadata
        prep: dict[str, Any] = {
            "audio_path": job.input_path,
            "metadata": job.metadata.get("preprocess_metadata") or {},
        }

        # 1) ASR
        with self._lock:
            job.status = JobStatus.asr
            job.progress = 0.2
            job.updated_at = datetime.now(timezone.utc).isoformat()
            self._set_stage(job, "asr", "running")
            self._persist_job(job)
        asr_result = transcription_service.transcribe_audio(prep["audio_path"])
        if not asr_result.get("success"):
            raise RuntimeError(asr_result.get("error", "ASR failed"))
        segments = asr_result.get("segments", [])
        with self._lock:
            self._set_stage(job, "asr", "done", {"segments": len(segments)})
            job.progress = 0.5
            self._persist_job(job)

        # 2) alignment
        with self._lock:
            job.status = JobStatus.alignment
            self._set_stage(job, "alignment", "running")
            self._persist_job(job)
        aligned_segments = self.alignment.align_segments(segments)
        with self._lock:
            self._set_stage(job, "alignment", "done")
            job.progress = 0.65
            self._persist_job(job)

        # 3) diarization / clustering
        with self._lock:
            job.status = JobStatus.diarization
            self._set_stage(job, "diarization", "running")
            self._persist_job(job)
        overlap_spans = prep.get("metadata", {}).get("overlap_candidates", [])
        
        # Загружаем аудио для построения эмбеддингов спикеров
        try:
            audio_np, audio_sr = librosa.load(prep["audio_path"], sr=16000, mono=True)
            logger.info(
                "Аудио загружено для диаризации: %d samples, %d Hz",
                len(audio_np),
                audio_sr,
            )
        except (FileNotFoundError, OSError, librosa.util.exceptions.ParameterError) as exc:
            logger.error(
                "Не удалось загрузить аудио файл %s для диаризации: %s", 
                prep["audio_path"], 
                exc
            )
            # Instead of empty array, raise non-retryable error for missing/corrupt audio
            raise PermanentAudioError(f"Аудио файл не найден или поврежден: {prep['audio_path']}") from exc
        except Exception as exc:
            logger.error(
                "Неожиданная ошибка при загрузке аудио %s: %s", 
                prep["audio_path"], 
                exc
            )
            raise RuntimeError(f"Ошибка загрузки аудио: {exc}") from exc
        
        # Строим эмбеддинги батчем (эффективнее и правильнее)
        batch_embeddings = self.embedding.build_batch_hybrid_embeddings(
            aligned_segments,
            audio=audio_np,
            sample_rate=audio_sr,
        )
        logger.info(
            "Построено %d эмбеддингов для %d сегментов",
            len(batch_embeddings),
            len(aligned_segments),
        )
        
        for idx, seg in enumerate(aligned_segments):
            seg["embedding"] = batch_embeddings[idx] if idx < len(batch_embeddings) else []
        
        diarized = self.clustering.assign_speakers(aligned_segments, overlap_spans=overlap_spans)
        
        # Логируем результаты кластеризации
        unique_speakers = set(seg.get("speaker") for seg in diarized if seg.get("speaker"))
        logger.info(
            "Диаризация завершена: обнаружено %d спикеров (%s)",
            len(unique_speakers),
            ", ".join(sorted(unique_speakers)),
        )
        
        timeline = self.attribution.build_speaker_timeline(diarized)
        with self._lock:
            self._set_stage(job, "diarization", "done", {"overlap_spans": len(overlap_spans)})
            job.progress = 0.82
            self._persist_job(job)

        # 4) postprocess
        with self._lock:
            job.status = JobStatus.postprocess
            self._set_stage(job, "postprocess", "running")
            self._persist_job(job)
        final_segments = self.postprocess.apply_to_segments(diarized)
        final_text = self.postprocess.build_final_transcript(final_segments)
        result = {
            "job_id": job.job_id,
            "pipeline": "ultra-sota-2026",
            "status": "done",
            "original_filename": job.original_filename,
            "stages": [asdict(stage) for stage in job.stages],
            "preprocess_metadata": prep.get("metadata", {}),
            "segments": final_segments,
            "speaker_timeline": timeline,
            "final_transcript": final_text,
            "total_duration": asr_result.get("total_duration", 0),
        }
        # Сохраняем результат и вызываем callback вне блокировки
        with self._lock:
            job.result = result
            job.progress = 100
            job.status = JobStatus.done
            job.updated_at = datetime.now(timezone.utc).isoformat()
            self._persist_job(job)
            # Копируем данные для callback перед выходом из блокировки
            job_copy = asdict(job)
            input_path = job.input_path
        # Вызываем callback и удаляем файл вне блокировки
        self._send_callback(JobRecord(**job_copy))
        self._safe_unlink(input_path)

    def estimate_eta_seconds(self, job: JobRecord) -> float | None:
        if job.status in {JobStatus.done, JobStatus.failed, JobStatus.cancelled}:
            return 0.0
        if job.progress <= 0:
            return None
        try:
            created = datetime.fromisoformat(job.created_at)
            now = datetime.now(timezone.utc)
            elapsed = max(1.0, (now - created).total_seconds())
            total_est = elapsed / max(0.01, job.progress)
            remaining = max(0.0, total_est - elapsed)
            return round(remaining, 1)
        except Exception:
            return None

    def _send_callback(self, job: JobRecord) -> None:
        callback_url = (job.metadata.get("callback_url") or "").strip()
        if not callback_url:
            return
        payload = {
            "job_id": job.job_id,
            "status": job.status.value,
            "progress": job.progress,
            "updated_at": job.updated_at,
            "error": job.error,
            "result": job.result,
        }
        try:
            requests.post(callback_url, json=payload, timeout=settings.callback_timeout)
        except Exception:
            logger.warning("Callback delivery failed for job %s", job.job_id)


job_orchestrator = JobOrchestrator()
