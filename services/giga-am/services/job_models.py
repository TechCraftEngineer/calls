from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    queued = "queued"
    preprocessing = "preprocessing"
    asr = "asr"
    alignment = "alignment"
    diarization = "diarization"
    postprocess = "postprocess"
    done = "done"
    failed = "failed"
    cancelled = "cancelled"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class PipelineStage:
    name: str
    status: str = "pending"
    started_at: str | None = None
    finished_at: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class JobRecord:
    job_id: str
    input_path: str
    original_filename: str
    status: JobStatus = JobStatus.queued
    progress: float = 0.0
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)
    error: str | None = None
    result: dict[str, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    stages: list[PipelineStage] = field(
        default_factory=lambda: [
            PipelineStage(name="preprocessing"),
            PipelineStage(name="asr"),
            PipelineStage(name="alignment"),
            PipelineStage(name="diarization"),
            PipelineStage(name="postprocess"),
        ]
    )
