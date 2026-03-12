#!/usr/bin/env python3
"""
Наполнение векторной БД (ChromaDB) историческими расшифровками звонков для RAG-чата.

Запуск:
  cd backend && python scripts/index_historical_calls.py
  docker exec mango-backend python /app/scripts/index_historical_calls.py

Скрипт идемпотентен: перед добавлением чанков по каждому call_id старые чанки удаляются.
"""
import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

from app.services.storage import SQLiteStorage
from app.services.vector_db import add_chunks


def main():
    logger.info("Starting index_historical_calls")
    storage = SQLiteStorage()
    limit = 100
    offset = 0
    total_indexed = 0
    total_chunks = 0

    while True:
        rows = storage.get_calls_with_transcripts(limit=limit, offset=offset)
        if not rows:
            logger.debug("No more rows at offset=%s", offset)
            break
        logger.debug("Processing batch offset=%s len=%s", offset, len(rows))
        for item in rows:
            call = item.get("call")
            transcript = item.get("transcript")
            if not call or not transcript or not (transcript.get("text") or "").strip():
                continue
            call_id = call.get("id")
            if not call_id:
                continue
            ts = call.get("timestamp")
            if isinstance(ts, datetime):
                date_str = ts.strftime("%Y-%m-%d")
            elif isinstance(ts, str):
                date_str = ts[:10] if len(ts) >= 10 else ""
            else:
                date_str = ""
            try:
                n = add_chunks(
                    call_id=call_id,
                    text=(transcript.get("text") or "").strip(),
                    metadata={
                        "date": date_str,
                        "internal_number": (call.get("internal_number") or ""),
                    },
                )
                total_indexed += 1
                total_chunks += n
            except Exception as e:
                logger.warning("call_id=%s index failed: %s", call_id, e)
        offset += limit
        if (offset // limit) % 10 == 0 and offset > 0:
            logger.info("Progress: offset=%s indexed=%s calls, %s chunks", offset, total_indexed, total_chunks)
        if len(rows) < limit:
            break

    logger.info("Done. Indexed %s calls, %s chunks total.", total_indexed, total_chunks)


if __name__ == "__main__":
    main()
