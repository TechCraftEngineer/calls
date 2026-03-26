# Benchmark и QA для Ultra-SOTA pipeline

## Быстрый запуск

```bash
python benchmark_pipeline.py \
  --base-url "https://<your-giga-am-space>.hf.space" \
  --dataset-dir "./benchmark_dataset" \
  --output "benchmark_report.json"
```

## Что измерять

- WER/CER для финального текста.
- DER для speaker attribution.
- Overlap F1 для перекрытий.
- Latency per hour audio (`latency_sec / total_duration`).

## A/B режим

- Baseline: `POST /api/transcribe`.
- Ultra pipeline: `POST /api/jobs` + `GET /api/jobs/{id}`.
- Сравнивайте на одном и том же датасете, фиксируя версии моделей/кода.

## Regression check (рекомендуемый порог)

- WER не должен ухудшаться > 3% относительно baseline.
- DER не должен ухудшаться > 5%.
- Median latency не должен расти > 30% без явного роста качества.
