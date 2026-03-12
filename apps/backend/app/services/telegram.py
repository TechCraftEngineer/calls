
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class TelegramService:
    def __init__(self, token: str):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}"

    async def send_message(self, chat_id: str, text: str) -> bool:
        """
        Отправляет текстовое сообщение в Telegram.
        
        Args:
            chat_id: ID чата (пользователя)
            text: Текст сообщения
            
        Returns:
            bool: True если успешно, False иначе
        """
        if not self.token:
            logger.warning("Telegram token is not set")
            return False
            
        if not chat_id:
            logger.warning("Chat ID is not provided")
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return True
                else:
                    logger.error(f"Failed to send Telegram message: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False

    async def get_bot_username(self) -> str:
        """
        Возвращает имя пользователя бота (без @). кэширует результат.
        """
        if hasattr(self, "_bot_username") and self._bot_username:
            return self._bot_username
            
        if not self.token:
            return ""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/getMe", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    self._bot_username = data.get("result", {}).get("username", "")
                    return self._bot_username
        except Exception as e:
            logger.error(f"Error getting bot username: {e}")
            return ""
        return ""

    async def start_polling(self, on_connect_callback, on_report_callback=None):
        """
        Запускает бесконечный цикл получения обновлений (Long Polling).
        
        Args:
            on_connect_callback: Функция, вызываемая при получении токена подключения.
                                 Сигнатура: async func(token: str, chat_id: str) -> bool
            on_report_callback: Функция для отправки отчёта по запросу (команда /report).
                               Сигнатура: async func(chat_id: str) -> bool
        """
        import asyncio

        if not self.token:
            logger.warning("Telegram token is not set. Polling not started.")
            return

        offset = 0
        logger.info("Starting Telegram bot polling...")

        def is_report_cmd(t: str) -> bool:
            cmd = (t or "").strip().lower()
            return cmd in ("/report", "/отчет", "/отчёт")

        while True:
            try:
                updates = await self._get_updates(offset)

                if updates and updates.get("ok") and updates.get("result"):
                    for update in updates["result"]:
                        update_id = update.get("update_id")
                        offset = update_id + 1

                        message = update.get("message")
                        if message and "text" in message:
                            text = message.get("text", "")
                            chat_id = str(message.get("chat", {}).get("id"))

                            if text.startswith("/start "):
                                parts = text.split(" ")
                                if len(parts) > 1:
                                    token = parts[1].strip()
                                    if token:
                                        logger.info("Telegram bot: получен /start, chat_id=%s, token передан в callback", chat_id)
                                        success = await on_connect_callback(token, chat_id)
                                        logger.info("Telegram bot: callback confirm_telegram_connect -> %s", success)
                                        if success:
                                            await self.send_message(chat_id, "✅ Аккаунт успешно подключен! Теперь вы будете получать отчеты сюда.")
                                        else:
                                            await self.send_message(chat_id, "❌ Не удалось подключить аккаунт. Возможно, ссылка устарела или неверна.")

                            elif text == "/start":
                                await self.send_message(
                                    chat_id,
                                    "Здравствуйте! Чтобы подключить уведомления, используйте кнопку в настройках вашего профиля на сайте.\n\n"
                                    "Команды:\n/report — отчёт по звонкам на сегодня"
                                )

                            elif is_report_cmd(text) and on_report_callback:
                                try:
                                    ok = await on_report_callback(chat_id)
                                    if not ok:
                                        await self.send_message(
                                            chat_id,
                                            "❌ Не удалось отправить отчёт. Убедитесь, что аккаунт подключен через настройки на сайте."
                                        )
                                    # при успехе отчёт уже отправлен
                                except Exception as e:
                                    logger.error("Error in on_report_callback: %s", e, exc_info=True)
                                    await self.send_message(chat_id, "❌ Ошибка при формировании отчёта.")

            except Exception as e:
                logger.error("Error in polling loop: %s", e)
                await asyncio.sleep(5)

            await asyncio.sleep(1)

    async def _get_updates(self, offset: int) -> Optional[dict]:
        """Внутренний метод для получения обновлений с offset."""
        if not self.token:
            return None
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                    timeout=40.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            # logger.error(f"Error getting updates: {e}") # Слишком много логов при ошибках сети
            pass
        return None

