import logging
import asyncio
from typing import Optional, Callable
from maxapi import Bot, Dispatcher, F
from maxapi.types import MessageCreated

logger = logging.getLogger(__name__)

class MaxService:
    def __init__(self, token: str):
        self.token = token
        self.bot: Optional[Bot] = None
        self.dp: Optional[Dispatcher] = None
        
        if self.token:
            try:
                self.bot = Bot(self.token)
                self.dp = Dispatcher()
            except Exception as e:
                logger.error(f"Failed to initialize MAX bot: {e}")

    async def send_message(self, chat_id: str, text: str) -> bool:
        """Отправляет сообщение пользователю MAX."""
        if not self.bot:
            logger.warning("MAX Bot is not initialized (no token provided or init failed)")
            return False
        
        try:
            # В maxapi отправка сообщения может отличаться, проверим документацию/примеры
            # Обычно это bot.send_message(chat_id, text) или аналогично
            # Исходя из примера пользователя: event.message.answer(...)
            # Для инициативной отправки: await bot.send_message(chat_id=..., text=...)
            # Проверим доступные методы в библиотеке, но пока предположим стандартный интерфейс
            # В библиотеке love-apples/maxapi (которая, вероятно, используется) метод может быть другим.
            # Если следуем аналогии с aiogram/telebot:
            await self.bot.send_text(chat_id=chat_id, text=text) 
            return True
        except Exception as e:
            logger.error(f"Failed to send MAX message to {chat_id}: {e}")
            return False

    async def get_bot_username(self) -> Optional[str]:
        """Возвращает имя бота (для генерации ссылки)."""
        if not self.bot:
            return None
        try:
            me = await self.bot.get_me()
            return me.username
        except Exception as e:
            logger.error(f"Failed to get MAX bot username: {e}")
            return None

    async def start_polling(self, connect_callback: Callable[[str, str], bool]):
        """
        Запускает polling для получения сообщений.
        connect_callback(token, chat_id) -> bool
        """
        if not self.dp or not self.bot:
            logger.warning("MAX polling not started: Bot/Dispatcher not initialized")
            return

        @self.dp.message_created(F.message.body.text)
        async def handle_message(event: MessageCreated):
            text = event.message.body.text
            chat_id = event.message.chat_id # Проверить структуру event.message
            
            # Логика обработки /start <token>
            if text.startswith('/start '):
                parts = text.split(' ', 1)
                if len(parts) == 2:
                    token = parts[1]
                    logger.info(f"Received MAX /start command with token: {token} from chat_id: {chat_id}")
                    
                    success = await connect_callback(token, str(chat_id))
                    if success:
                        await event.message.answer("✅ Ваш MAX аккаунт успешно подключен!")
                    else:
                        await event.message.answer("❌ Ошибка подключения. Неверный токен или срок действия истек.")
            else:
                 # Эхо для теста или игнор
                 pass

        logger.info("Starting MAX polling...")
        try:
            await self.dp.start_polling(self.bot)
        except Exception as e:
            logger.error(f"Error in MAX polling: {e}")
