#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import requests


def run_job(base_url: str, audio_path: Path, timeout_sec: int = 3600) -> dict:
    with open(audio_path, "rb") as f:
        resp = requests.post(f"{base_url.rstrip('/')}/api/jobs", files={"file": f}, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    job_id = data["job_id"]
    started = time.time()

    while True:
        status_resp = requests.get(f"{base_url.rstrip('/')}/api/jobs/{job_id}", timeout=60)
        status_resp.raise_for_status()
        status_data = status_resp.json()
        if status_data["status"] in {"done", "failed", "cancelled"}:
            status_data["latency_sec"] = round(time.time() - started, 3)
            return status_data
        if time.time() - started > timeout_sec:
            raise TimeoutError(f"Job timeout for {audio_path.name}")
        time.sleep(5)


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark Ultra-SOTA async pipeline")
    parser.add_argument("--base-url", required=True, help="Base URL of giga-am Space")
    parser.add_argument("--dataset-dir", required=True, help="Directory with audio files")
    parser.add_argument("--output", default="benchmark_report.json", help="Output JSON file")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset_dir)
    files = sorted([p for p in dataset_dir.iterdir() if p.suffix.lower() in {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm", ".aac"}])
    report = {"base_url": args.base_url, "results": []}

    for audio_path in files:
        item = {"file": audio_path.name}
        try:
            result = run_job(args.base_url, audio_path)
            item["status"] = result.get("status")
            item["latency_sec"] = result.get("latency_sec")
            item["total_duration"] = (
                result.get("result", {}).get("total_duration", 0.0)
                if result.get("result")
                else 0.0
            )
        except Exception as exc:
            item["status"] = "error"
            item["error"] = str(exc)
        report["results"].append(item)

    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Benchmark report saved to {args.output}")


if __name__ == "__main__":
    main()
