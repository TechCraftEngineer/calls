#!/usr/bin/env python3
"""
Дозаполнение оценок (ценность) и выводов (саммари) для звонков, у которых есть
транскрипт, но нет оценки или саммари.

Запуск на сервере (в контейнере бэкенда):
  docker exec mango-backend python /app/scripts/backfill_evaluations.py
  docker exec mango-backend python /app/scripts/backfill_evaluations.py --date 2026-02-26
  docker exec mango-backend python /app/scripts/backfill_evaluations.py --days 1

Или локально: cd backend && python scripts/backfill_evaluations.py
"""
import argparse
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.storage import SQLiteStorage
from app.services.deepseek import evaluate_call, generate_summary, extract_customer_name


def main():
    parser = argparse.ArgumentParser(description="Дозаполнение оценок и выводов по транскриптам")
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="Обработать только звонки за эту дату")
    parser.add_argument("--days", type=int, default=0, help="Обработать звонки за последние N дней (0 = все)")
    parser.add_argument("--dry-run", action="store_true", help="Только показать, что будет сделано")
    args = parser.parse_args()

    storage = SQLiteStorage()

    # Собираем call_id, у которых есть транскрипт
    with storage._get_connection() as conn:
        conn.row_factory = lambda c, r: r
        cursor = conn.execute(
            "SELECT t.call_id, t.id as transcript_id, t.text, t.summary FROM transcripts t"
        )
        rows = cursor.fetchall()

    # Фильтр по дате: нужны call_id звонков за указанную дату/период
    date_from = None
    date_to = None
    if args.date:
        try:
            date_from = datetime.strptime(args.date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            date_to = date_from.replace(hour=23, minute=59, second=59, microsecond=999999)
        except ValueError:
            print(f"Ошибка: неверный формат даты {args.date}, нужен YYYY-MM-DD")
            sys.exit(1)
    elif args.days > 0:
        date_to = datetime.now()
        date_from = date_to - timedelta(days=args.days)

    to_process = []
    for row in rows:
        call_id, transcript_id, text, summary = row[0], row[1], row[2], row[3]
        text = (text or "").strip()
        if not text:
            continue
        if date_from is not None:
            call = storage.get_call(call_id)
            if not call or not call.get("timestamp"):
                continue
            ts = call["timestamp"]
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except Exception:
                    continue
            if ts.tzinfo:
                ts = ts.replace(tzinfo=None)
            if date_from and (ts < date_from or ts > date_to):
                continue
        eval_row = storage.get_evaluation(call_id)
        # Повторно оцениваем, если: нет оценки, или value_score=0/None (часто при ошибке API),
        # или обоснование пустое/содержит "Ошибка"
        val_score = eval_row.get("value_score") if eval_row else None
        val_expl = (eval_row.get("value_explanation") or "").strip() if eval_row else ""
        needs_eval = (
            eval_row is None
            or val_score is None
            or val_score == 0
            or not val_expl
            or "Ошибка" in val_expl
        )
        needs_summary = not (summary or "").strip()
        call_row = storage.get_call(call_id)
        needs_customer = not (call_row.get("customer_name") or "").strip() if call_row else True
        if needs_eval or needs_summary or needs_customer:
            to_process.append({
                "call_id": call_id,
                "transcript_id": transcript_id,
                "text": text,
                "needs_eval": needs_eval,
                "needs_summary": needs_summary,
                "needs_customer": needs_customer,
            })

    if not to_process:
        print("Нет звонков для дозаполнения (все уже с оценкой и выводом).")
        return

    print(f"Найдено звонков для дозаполнения: {len(to_process)}")
    if args.dry_run:
        for p in to_process[:20]:
            print(f"  call_id={p['call_id']} eval={p['needs_eval']} summary={p['needs_summary']} customer={p.get('needs_customer')}")
        if len(to_process) > 20:
            print(f"  ... и ещё {len(to_process) - 20}")
        return

    ok_eval = 0
    ok_summary = 0
    ok_customer = 0
    for p in to_process:
        call_id = p["call_id"]
        call = storage.get_call(call_id)
        direction = (call.get("direction") or "Входящий") if call else "Входящий"

        if p.get("needs_customer") and call:
            try:
                internal_num = call.get("internal_number")
                manager_name = storage.get_operator_name_by_internal_number(internal_num) if internal_num else None
                customer_name = extract_customer_name(p["text"], manager_name=manager_name or "Оператор", direction=direction)
                if customer_name:
                    storage.update_call(call_id, {"customer_name": customer_name})
                    ok_customer += 1
                    print(f"  [OK] call_id={call_id} — имя заказчика сохранено: {customer_name}")
            except Exception as e:
                print(f"  [WARN] call_id={call_id} — ошибка извлечения имени: {e}")

        if p["needs_summary"]:
            try:
                summary = generate_summary(p["text"], direction, None)
                if summary and p["transcript_id"]:
                    storage.update_transcript(
                        p["transcript_id"],
                        {"summary": summary.get("summary", ""), "title": summary.get("title", "Разговор")},
                    )
                    ok_summary += 1
                    print(f"  [OK] call_id={call_id} — вывод (саммари) сохранён")
            except Exception as e:
                print(f"  [WARN] call_id={call_id} — ошибка саммари: {e}")

        if p["needs_eval"]:
            try:
                evaluation_results = evaluate_call(p["text"], direction)
                if evaluation_results:
                    evaluation_results["call_id"] = call_id
                    storage.add_evaluation(evaluation_results)
                    ok_eval += 1
                    print(f"  [OK] call_id={call_id} — оценка сохранена (value={evaluation_results.get('value_score')})")
            except Exception as e:
                print(f"  [WARN] call_id={call_id} — ошибка оценки: {e}")

    print(f"\nГотово. Дозаполнено: оценок={ok_eval}, выводов={ok_summary}, имён заказчиков={ok_customer}")


if __name__ == "__main__":
    main()
