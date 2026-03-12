#!/usr/bin/env python3
"""
Скрипт для ручной отправки тестового отчёта по звонкам в Telegram.

Запуск на сервере:
  docker exec mango-backend python /app/scripts/send_test_report.py
  docker exec mango-backend python /app/scripts/send_test_report.py --full

Тестовое сообщение на chat_id (без отчёта по звонкам):
  docker exec mango-backend python /app/scripts/send_test_report.py --test 752934463

Или локально: cd backend && python scripts/send_test_report.py
"""
import argparse
import asyncio
import os
import sys

# Добавляем путь к app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.storage import SQLiteStorage
from app.services.telegram import TelegramService
from app.services.reports import ReportGenerator
from app.services.max_messenger import MaxService


async def send_test_message(telegram_service: TelegramService, chat_id: str):
    """Отправляет тестовое сообщение на указанный chat_id."""
    text = "🔔 Тестовое сообщение от Mango React Bot. Бот работает!"
    ok = await telegram_service.send_message(chat_id, text)
    return ok


async def main():
    parser = argparse.ArgumentParser(description="Отправка тестового отчёта в Telegram")
    parser.add_argument("--test", metavar="CHAT_ID", help="Отправить только тестовое сообщение на chat_id")
    parser.add_argument("--full", action="store_true", help="Полный ежедневный отчёт (для подписанных пользователей)")
    args = parser.parse_args()

    storage = SQLiteStorage()
    telegram_token = storage.get_prompt("telegram_bot_token", "")
    if not telegram_token:
        print("Ошибка: telegram_bot_token не задан в настройках.")
        sys.exit(1)

    telegram_service = TelegramService(telegram_token)

    if args.test:
        print(f"Отправка тестового сообщения на chat_id={args.test}...")
        ok = await send_test_message(telegram_service, args.test)
        if ok:
            print("Отправлено. Проверьте Telegram.")
        else:
            print("Ошибка отправки. Проверьте токен бота и chat_id.")
            sys.exit(1)
        return

    # Полный отчёт
    max_token = storage.get_prompt("max_bot_token", "")
    max_service = MaxService(max_token) if max_token else None
    report_generator = ReportGenerator(storage, telegram_service, max_service)

    print("Запуск отправки ежедневных отчётов...")
    await report_generator.send_daily_reports()
    print("Готово. Проверьте Telegram.")


if __name__ == "__main__":
    asyncio.run(main())
