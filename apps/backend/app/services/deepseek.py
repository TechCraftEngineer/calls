"""Клиент для работы с DeepSeek API.

Получение API ключа совпадает с логикой sync_mango_records.py:
сначала settings (из backend/core/config), затем env, затем корневой config.py.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..core import config as app_config

logger = logging.getLogger(__name__)
import httpx
from openai import OpenAI


def _get_deepseek_api_key() -> str:
    """Ключ DeepSeek: как в sync_mango_records — settings, env, корневой config.py."""
    key = (app_config.settings.DEEPSEEK_API_KEY or "").strip()
    if key:
        return key
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if key:
        return key
    # Как в sync: загрузка корневого config.py (тот же источник, что у sync_mango_records)
    for config_path in [
        Path("/app") / "config.py",
        Path(__file__).resolve().parent.parent.parent.parent / "config.py",
    ]:
        try:
            if config_path.exists():
                import importlib.util
                spec = importlib.util.spec_from_file_location("_root_config", str(config_path))
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                key = getattr(mod, "DEEPSEEK_API_KEY", "") or ""
                if isinstance(key, str) and key.strip():
                    return key.strip()
        except Exception:
            continue
    return ""


# Настройка HTTP клиента с прокси (если включен для DeepSeek)
# DeepSeek работает без прокси; DEEPSEEK_USE_PROXY=False по умолчанию
http_client_kwargs = {'trust_env': False}
if app_config.settings.PROXY_ENABLED and app_config.settings.DEEPSEEK_USE_PROXY:
    # Используем HTTP прокси (не SOCKS)
    proxy_url = app_config.settings.HTTPS_PROXY or app_config.settings.HTTP_PROXY
    if proxy_url:
        # Убеждаемся, что прокси указан в формате http:// (не socks://)
        if proxy_url.startswith('socks'):
            # Заменяем socks:// на http://
            proxy_url = proxy_url.replace('socks5://', 'http://').replace('socks4://', 'http://')
        elif not proxy_url.startswith('http'):
            # Если нет префикса, добавляем http://
            proxy_url = f'http://{proxy_url}'
        # Для httpx используем параметр proxy как строку
        http_client_kwargs['proxy'] = proxy_url

# Создаем HTTP клиент с прокси (если настроен) или без прокси
http_client = httpx.Client(**http_client_kwargs)

# Ключ тем же способом, что и в sync_mango_records (config.DEEPSEEK_API_KEY)
_deepseek_key = _get_deepseek_api_key()
client = OpenAI(
    api_key=_deepseek_key,
    base_url=app_config.settings.DEEPSEEK_API_BASE or "https://api.deepseek.com",
    http_client=http_client,
)

# Конфигурация моделей DeepSeek
DEEPSEEK_MODELS_CONFIG = {
    "deepseek-chat": {
        "name": "DeepSeek Chat",
        "id": "deepseek-chat",
        "rpm": 30,
        "rpd": 1000
    },
    "deepseek-reasoner": {
        "name": "DeepSeek Reasoner",
        "id": "deepseek-reasoner",
        "rpm": 10,
        "rpd": 500
    }
}


def chat_completion(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
) -> str:
    """
    Generic chat completion: sends messages to DeepSeek and returns assistant reply.
    messages: list of {"role": "user"|"assistant"|"system", "content": "..."}.
    If system_prompt is provided, it is prepended as a system message.
    """
    if not messages:
        raise ValueError("messages cannot be empty")
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    logger.debug("chat_completion: messages=%s temperature=%s", len(full_messages), temperature)
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=full_messages,
            temperature=temperature,
        )
        content = (response.choices[0].message.content or "").strip()
        logger.debug("chat_completion: response length=%s", len(content))
        return content
    except Exception as e:
        logger.exception("chat_completion failed: %s", e)
        raise


def transcribe_audio(audio_path: Path, use_mock: bool = False) -> Optional[str]:
    """
    Транскрибирует аудио файл через OpenAI API (DeepSeek не поддерживает Whisper).
    
    Args:
        audio_path: Путь к MP3 файлу
        use_mock: Если True, возвращает тестовую транскрипцию вместо реальной
        
    Returns:
        Текст транскрипции или None в случае ошибки
    """
    # Для тестирования можно использовать мок-транскрипцию
    if use_mock:
        return (
            "Оператор: Здравствуйте! Это служба поддержки. Чем могу помочь?\n"
            "Клиент: Здравствуйте, хотел бы уточнить статус моего заказа.\n"
            "Оператор: Конечно, назовите номер заказа, пожалуйста.\n"
            "Клиент: Заказ номер 54321.\n"
            "Оператор: Проверяю... Ваш заказ находится в пути, доставка запланирована на завтра до 18:00.\n"
            "Клиент: Отлично, спасибо за информацию!\n"
            "Оператор: Пожалуйста! Отправил вам SMS с номером отслеживания. Хорошего дня!"
        )
    
    try:
        # DeepSeek не поддерживает Whisper API, используем OpenAI API для транскрибации
        from openai import OpenAI as OpenAIClient
        import os
        
        # Пробуем использовать OpenAI API ключ из переменной окружения
        openai_key = os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            print("ВНИМАНИЕ: Переменная окружения OPENAI_API_KEY не установлена!")
            print("DeepSeek не поддерживает Whisper API для транскрибации.")
            print("Для реальной транскрибации установите: set OPENAI_API_KEY=your-key")
            print("Или используйте use_mock=True для тестовой транскрипции")
            return None
        
        # Используем тот же HTTP клиент с прокси, что и для основного клиента
        openai_client = OpenAIClient(api_key=openai_key, http_client=http_client)
        
        with open(audio_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ru",
            )
            return transcript.text
    except Exception as e:
        print(f"Ошибка транскрибации: {e}")
        print("Примечание: Для транскрибации нужен OpenAI API ключ (DeepSeek не поддерживает Whisper)")
        print("Установите переменную окружения OPENAI_API_KEY или используйте OpenAI ключ")
        return None


def analyze_speakers(transcript_text: str, direction: Optional[str] = None, manager_name: Optional[str] = None) -> Optional[str]:
    """
    Анализирует транскрипт с метками [A], [B] и определяет кто является сотрудником QBS,
    форматирует текст с правильными именами спикеров.
    
    Args:
        transcript_text: Текст транскрипции в формате [A]: текст, [B]: текст
        direction: Направление звонка (Входящий/Исходящий)
        manager_name: Имя менеджера/оператора QBS
        
    Returns:
        Отформатированный текст с правильными именами спикеров или None в случае ошибки
    """
    try:
        # Получаем промпт для анализа спикеров в зависимости от направления
        prompt_key = "speaker_analysis"
        if direction:
            d_lower = direction.lower()
            if "входящий" in d_lower or "incoming" in d_lower:
                prompt_key = "speaker_analysis_incoming"
            elif "исходящий" in d_lower or "outgoing" in d_lower:
                prompt_key = "speaker_analysis_outgoing"
        
        # Базовый промпт для анализа спикеров
        base_prompt = """АНАЛИЗ РАЗГОВОРА И ОПРЕДЕЛЕНИЕ СПИКЕРОВ

У тебя транскрипция с временными метками спикеров: [A], [B], [C] и т.д.
Эти метки НЕ ОЗНАЧАЮТ роли, это просто технические идентификаторы.

КОНТЕКСТ:
В разговоре участвует менеджер компании QBS: [имя менеджера].
Твоя задача — правильно идентифицировать его реплики.

КРИТИЧЕСКИ ВАЖНО:
- Сохрани ВСЕ реплики из исходного транскрипта
- НЕ объединяй реплики разных спикеров
- НЕ пропускай ни одной реплики
- Каждая реплика [A] и [B] должна быть представлена отдельной строкой

ЗАДАЧА:
1. Определи, кто из спикеров является СОТРУДНИКОМ QBS ([имя менеджера])
2. Определи, кто является СОБЕСЕДНИКОМ (клиент/поставщик)
3. Присвой им правильные имена на основе диалога
4. Отформатируй текст, сохранив ВСЕ реплики

КРИТЕРИИ ОПРЕДЕЛЕНИЯ СОТРУДНИКА QBS ([имя менеджера]):
- Для ИСХОДЯЩИХ звонков: обычно начинает разговор, может сказать "алло" при ответе
- Упоминает компанию QBS или работает от имени QBS
- Объясняет цель звонка (запрос, консультация, уточнение)
- Может представиться: "Это [имя менеджера]" или "Это [Имя] из QBS"
- Использует профессиональную лексику компании
- Отвечает на вопросы о товарах/услугах QBS

КРИТЕРИИ ОПРЕДЕЛЕНИЯ СОБЕСЕДНИКА:
- Для ИСХОДЯЩИХ звонков: отвечает на звонок, может представиться своим именем/компанией
- Для ВХОДЯЩИХ звонков: обычно начинает разговор
- Представляется своим именем, фамилией, названием компании
- Задает вопросы о товарах/услугах или отвечает на запросы

ДАННЫЕ ДЛЯ АНАЛИЗА:
{transcript_text}

ИНСТРУКЦИЯ ПО ФОРМАТИРОВАНИЮ:
1. Замени технические метки ([A], [B]) на:
   - Для сотрудника QBS: "[имя менеджера] (QBS)" или "Оператор (QBS)"
   - Для собеседника: фактическое имя/название компании или "Клиент"/"Поставщик"
2. Исправь опечатки, расставь пунктуацию
3. Удали технические метки, оставь только читаемый диалог
4. Сохрани ВСЕ реплики в том же порядке

ФОРМАТ ВЫВОДА:
ИмяСпикера: Текст реплики
(каждая реплика с новой строки, между репликами разных спикеров - пустая строка)

Пример:
[имя менеджера] (QBS): Да, алло.

Клиент: Добрый день, это Руслан, компания КПС.

[имя менеджера] (QBS): Здравствуйте, слушаю вас.

ВЕРНИ ТОЛЬКО ОТФОРМАТИРОВАННЫЙ ДИАЛОГ. Сохрани ВСЕ реплики из исходного транскрипта."""

        # Получаем промпт из базы данных
        analyze_prompt_template = get_prompt(
            prompt_key,
            base_prompt
        )
        
        # Подставляем имя менеджера в промпт (если указано)
        if manager_name:
            manager_name_clean = manager_name.strip()
            analyze_prompt_template = analyze_prompt_template.replace("[имя менеджера]", manager_name_clean)
        else:
            # Если имя менеджера не указано, заменяем на "Оператор"
            analyze_prompt_template = analyze_prompt_template.replace("[имя менеджера]", "Оператор")
        
        # Заменяем плейсхолдер транскрипта
        prompt = analyze_prompt_template.replace("{transcript_text}", transcript_text)
        
        print(f"--- [DEEPSEEK] Analyzing speakers (prompt key: {prompt_key}) ---")
        # Используем deepseek-chat (быстрее и точнее по результатам A/B теста)
        # Для более детерминированных результатов используем более низкую температуру
        temperature = 0.1 if prompt_key in ["transcribe_incoming", "transcribe_outgoing"] else 0.3
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=temperature,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Убираем markdown код блоки если есть
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            content = content.replace("```", "").strip()
        
        # Проверяем полноту результата
        # Подсчитываем количество реплик в исходном тексте и в результате
        original_replies = transcript_text.count('[A]:') + transcript_text.count('[B]:')
        result_replies = len([line for line in content.splitlines() if ':' in line and line.strip()])
        
        if result_replies < original_replies:
            print(f"--- [DEEPSEEK] WARN: Получено {result_replies} реплик вместо {original_replies} (потеряно {original_replies - result_replies}) ---")
            # Пытаемся исправить - добавляем предупреждение, но возвращаем что есть
            # В будущем можно добавить повторный запрос с более строгим промптом
        
        print(f"--- [DEEPSEEK] Speaker analysis completed ({result_replies}/{original_replies} реплик) ---")
        return content
        
    except Exception as e:
        print(f"--- [DEEPSEEK] ERROR in analyze_speakers: {e} ---")
        import traceback
        traceback.print_exc()
        return None


def extract_customer_name(transcript_text: str, manager_name: str, direction: Optional[str] = None) -> Optional[str]:
    """
    Извлекает имя заказчика из транскрипта разговора.
    
    Args:
        transcript_text: Отформатированный текст транскрипции с именами спикеров
        manager_name: Имя менеджера/оператора QBS
        direction: Направление звонка (Входящий/Исходящий)
        
    Returns:
        Имя заказчика или None, если не найдено
    """
    try:
        base_prompt = """ОПРЕДЕЛЕНИЕ ИМЕНИ ЗАКАЗЧИКА

У тебя есть транскрипция разговора между менеджером и заказчиком.

ИНФОРМАЦИЯ:
- С одной стороны разговора был менеджер: {manager_name}
- С другой стороны был заказчик (клиент или поставщик)
- Направление звонка: {direction}

ЗАДАЧА:
Определи реальное человеческое имя заказчика из транскрипта.
ВАЖНО: Имя может быть названо самим заказчиком ("Меня зовут Иван"), А МОЖЕТ быть названо менеджером при обращении ("Марина, добрый день").

Ищи:
1. Имя и/или фамилию, которыми представился заказчик.
2. Имя, по которому менеджер обращается к заказчику.

АВТООТВЕТЧИК:
Если вместо живого заказчика в транскрипте слышен голос автоответчика (робота), фразы типа:
- "Вас приветствует компания..."
- "Здравствуйте, вы позвонили в..."
- "К сожалению, абонент не может ответить..."
- "Оставьте ваше сообщение после сигнала..."
- "Переадресация вызова..."
И при этом в разговоре НЕТ живого диалога с человеком, верни "Автоответчик".

КРИТИЧЕСКИ ВАЖНО - ИСКЛЮЧИ НАЗВАНИЯ КОМПАНИЙ:
Следующие названия являются названиями компании QBS (нашей компании), НЕ именами клиентов:
- QBS
- КБС
- Кью Би ЭС
- Кью-Би-Эс
- КБС (в любом написании)

ЭТИ НАЗВАНИЯ НИКОГДА НЕ ДОЛЖНЫ БЫТЬ ОПРЕДЕЛЕНЫ КАК ИМЯ КЛИЕНТА!

СТРОГИЕ ПРАВИЛА:
- Верни ТОЛЬКО имя человека (без дополнительных слов, без названий компаний)
- Если это автоответчик, верни "Автоответчик"
- Если заказчик представился полным именем (например, "Иван Петров"), верни "Иван Петров"
- Если заказчик представился только именем (например, "Иван"), верни "Иван"
- Если заказчик представился только фамилией (например, "Петров"), верни "Петров"
- НЕ возвращай названия компаний, организаций, ООО, ИП и т.д.
- НЕ возвращай QBS, КБС, Кью Би ЭС и их варианты написания
- НЕ возвращай имя менеджера ({manager_name})
- Если заказчик представился только названием компании (без имени), верни null
- Если имя не найдено, верни null

ТРАНСКРИПТ РАЗГОВОРА:
{transcript_text}

ВЕРНИ ОТВЕТ ТОЛЬКО В JSON ФОРМАТЕ:
{{
  "customer_name": "имя заказчика" или "Автоответчик" или null
}}"""

        # Пытаемся получить промпт из базы данных
        prompt_template = get_prompt("customer_name_extraction", base_prompt)

        # Подставляем значения в промпт
        prompt = prompt_template.replace("{manager_name}", manager_name or "Оператор")
        prompt = prompt.replace("{direction}", direction or "Неизвестно")
        prompt = prompt.replace("{transcript_text}", transcript_text)
        
        print(f"--- [DEEPSEEK] Extracting customer name (manager: {manager_name}) ---")
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=0.2,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Убираем markdown код блоки если есть
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            content = content.replace("```", "").strip()
        
        # Очистка от лишних символов
        content = content.replace("```json", "").replace("```", "").strip()
        
        # Пытаемся найти JSON в тексте
        start_idx = content.find('{')
        if start_idx != -1:
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i
                        break
            if end_idx != -1:
                content = content[start_idx:end_idx+1]
        
        # Исправление частой ошибки: лишняя запятая перед закрывающей скобкой
        content = re.sub(r',\s*}', '}', content)
        
        # Парсим JSON
        try:
            result = json.loads(content)
            customer_name = result.get("customer_name")
            
            # Если имя пустое или None, возвращаем None
            if not customer_name or customer_name.strip() == "":
                print(f"--- [DEEPSEEK] Customer name not found ---")
                return None
            
            customer_name = customer_name.strip()
            
            # Дополнительная проверка: исключаем названия компании QBS
            qbs_company_names = ["qbs", "кбс", "кью би эс", "кью-би-эс"]
            customer_name_lower = customer_name.lower().strip()
            
            # Проверяем точное совпадение или если название QBS является основным содержимым
            # Исключаем случаи типа "КБС" или "QBS" как отдельные слова
            for qbs_name in qbs_company_names:
                # Точное совпадение
                if customer_name_lower == qbs_name:
                    print(f"--- [DEEPSEEK] Rejected company name (QBS exact match): {customer_name} ---")
                    return None
                # Если название QBS является отдельным словом в строке (не частью другого слова)
                if f" {qbs_name} " in f" {customer_name_lower} " or customer_name_lower.startswith(qbs_name + " ") or customer_name_lower.endswith(" " + qbs_name):
                    print(f"--- [DEEPSEEK] Rejected company name (QBS as word): {customer_name} ---")
                    return None
            
            # Проверяем, не похоже ли имя на название компании (содержит аббревиатуры, ООО, ИП и т.д.)
            company_indicators = ["ооо", "ип", "зао", "оао", "пао", "нп", "нко", "компания", "фирма"]
            if any(indicator in customer_name_lower for indicator in company_indicators):
                print(f"--- [DEEPSEEK] Rejected company name: {customer_name} ---")
                return None
            
            print(f"--- [DEEPSEEK] Customer name extracted: {customer_name} ---")
            return customer_name
            
        except json.JSONDecodeError as json_err:
            print(f"--- [DEEPSEEK] ERROR parsing customer name JSON: {json_err} ---")
            print(f"--- [DEEPSEEK] Content: {content[:500]} ---")
            return None
        
    except Exception as e:
        print(f"--- [DEEPSEEK] ERROR in extract_customer_name: {e} ---")
        import traceback
        traceback.print_exc()
        return None


def get_prompt(key: str, default: str = "") -> str:
    """Получает промпт из базы данных или возвращает значение по умолчанию."""
    try:
        from .storage import SQLiteStorage
        storage = SQLiteStorage()
        prompt = storage.get_prompt(key)
        return prompt if prompt else default
    except Exception as e:
        print(f"Ошибка получения промпта {key}: {e}")
        return default


def generate_summary(transcript_text: str, direction: Optional[str] = None, call_type_context: Optional[str] = None) -> Dict[str, Any]:
    """
    Генерирует саммари разговора через DeepSeek API.
    Использует промпт из базы данных.
    
    Args:
        transcript_text: Текст транскрипции в формате [A]: текст, [B]: текст
        direction: Направление звонка (Входящий/Исходящий)
        call_type_context: Контекст типа звонка (например, "клиента", "поставщику")
        
    Returns:
        Словарь с полями:
        - title: Краткое название разговора
        - sentiment: Тональность (Позитивный/Нейтральный/Негативный)
        - confidence: Уверенность (0.0-1.0)
        - summary: Краткое саммари
        - caller_name: Имя звонящего (или null)
        - call_type: Тип звонка
        - call_topic: Тема звонка
    """
    try:
        # Формируем контекст типа звонка
        context_prefix = ""
        if direction:
            direction_lower = direction.lower()
            if "входящий" in direction_lower or "incoming" in direction_lower:
                if call_type_context:
                    context_prefix = f"Тип звонка: Входящий звонок {call_type_context}\n\n"
                else:
                    context_prefix = "Тип звонка: Входящий звонок\n\n"
            elif "исходящий" in direction_lower or "outgoing" in direction_lower:
                if call_type_context:
                    context_prefix = f"Тип звонка: Исходящий звонок {call_type_context}\n\n"
                else:
                    context_prefix = "Тип звонка: Исходящий звонок\n\n"
        
        # Получаем промпт из базы данных
        summary_prompt_template = get_prompt(
            "summary",
            """Проанализируй следующий разговор и выполни комплексную задачу по классификации и суммаризации.

ТВОИ ЗАДАЧИ:
1. Определи имя/название звонящего.
Извлеки:
Имя человека (если назвал имя/фамилию)
Название компании (если представился организацией)
Если звонящий не представился — верни null.
Используй только то, что явно присутствует в разговоре.

2. Определи тип звонка (Counterparty Type).
Проанализируй поведение и цель звонящего/собеседника. Определи тип по одному из вариантов:
"Клиент" — спрашивает цену, наличие, делает заказ, уточняет доставку, задаёт клиентские вопросы, или это действующий клиент.
"Поставщик" — предлагает товар/условия, логистику, поставки, или мы звоним поставщику.
"Реклама" — продаёт услуги, предлагает продвижение, маркетинг, IT (спам).
"Незнакомый" — тема непонятна, нет представления и цели.
"Техподдержка" — звонок по технической проблеме.
"Сотрудник" — внутренний звонок между коллегами.
Выбери наиболее подходящий.

3. Определи тему/намерение звонка (call_topic).
Короткая фраза (2-5 слов), описывающая суть вопроса или цель.
Используй следующие примеры как ориентир:
- "Возражение (цена)" — если клиент говорит что дорого или у конкурентов дешевле.
- "Уточнение наличия" — если спрашивают про товар/артикул.
- "Заказ доставки" — оформление доставки.
- "Предложение услуг" — если это реклама или входящее предложение.
- "Консультация по товару" — вопросы о характеристиках.
- "Обсуждение КП" — коммерческое предложение.
- "Жалоба" — если клиент недоволен.

4. Создай краткое название разговора (title).
Требования:
2–5 слов
обязательно укажи имя звонящего (или "Неизвестный")
обязательно укажи тип звонка
Пример:
Иван Петров — звонок клиента
ООО Альфа — поставщик

5. Определи тональность разговора.
Используй строго один вариант:
"Позитивный"
"Нейтральный"
"Негативный"

6. Определи уровень уверенности анализа.
Значение от 0.0 до 1.0 (число).

7. Сформируй краткое саммари.
Требования:
1 предложение
до 100 символов
должно содержать суть звонка, его основную цель и результат.

СТРОГИЙ ФОРМАТ ОТВЕТА (ТОЛЬКО JSON, без markdown):
{{
  "caller_name": "... или null",
  "call_type": "Клиент / Поставщик / Реклама / Незнакомый / Техподдержка / Сотрудник",
  "call_topic": "...",
  "title": "...",
  "sentiment": "Позитивный / Нейтральный / Негативный",
  "confidence": 0.0,
  "summary": "..."
}}

ТЕКСТ РАЗГОВОРА ДЛЯ АНАЛИЗА:
{transcript_text}"""
        )
        
        # Заменяем плейсхолдер {transcript_text} на реальный текст
        prompt = summary_prompt_template.replace("{transcript_text}", transcript_text)
        
        # Добавляем контекст типа звонка в начало промпта
        if context_prefix:
            prompt = context_prefix + prompt

        print(f"--- [DEEPSEEK] Generating Summary ---")
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        
        # Убираем markdown код блоки если есть
        if content.startswith("```"):
            lines = content.split("\n")
            # Ищем начало и конец JSON
            start = 0
            end = len(lines)
            if lines[0].startswith("```"):
                start = 1
            if lines[-1].startswith("```"):
                end = -1
            content = "\n".join(lines[start:end])
        
        # Очистка от лишних символов
        content = content.replace("```json", "").replace("```", "").strip()
        
        # Пытаемся найти JSON в тексте, если он встроен в другой текст
        start_idx = content.find('{')
        if start_idx != -1:
            # Считаем вложенность скобок, чтобы найти правильную закрывающую
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i
                        break
            if end_idx != -1:
                content = content[start_idx:end_idx+1]
        
        # Дополнительная очистка
        content = content.strip()
        if content.startswith("json"):
            content = content[4:].strip()
        if content.startswith("JSON"):
            content = content[4:].strip()
        
        # Исправление частой ошибки: лишняя запятая перед закрывающей скобкой
        content = re.sub(r',\s*}', '}', content)
        
        # Пытаемся распарсить JSON
        try:
            result = json.loads(content)
        except json.JSONDecodeError as json_err:
            print(f"Не удалось распарсить JSON. Ошибка: {json_err}")
            print(f"Содержимое (первые 500 символов): {content[:500]}")
            raise json_err
        
        # Валидация и нормализация
        return {
            "title": result.get("title", "Разговор"),
            "sentiment": result.get("sentiment", "Нейтральный"),
            "confidence": float(result.get("confidence", 0.8)),
            "summary": result.get("summary", ""),
            "caller_name": result.get("caller_name"),
            "call_type": result.get("call_type"),
            "call_topic": result.get("call_topic"),
        }
    except Exception as e:
        print(f"Ошибка генерации саммари через DeepSeek: {e}")
        import traceback
        traceback.print_exc()
        # Возвращаем значения по умолчанию
        return {
            "title": "Разговор",
            "sentiment": "Нейтральный",
            "confidence": 0.5,
            "summary": "",
            "caller_name": None,
            "call_type": None,
            "call_topic": None,
        }


def evaluate_call(transcript_text: str, direction: str) -> Dict[str, Any]:
    """
    Оценивает звонок: ценность и качество работы менеджера.
    
    Returns:
        Dict: {
            "value_score": int,
            "value_explanation": str,
            "is_quality_analyzable": bool,
            "not_analyzable_reason": str,
            "manager_score": float,
            "manager_feedback": str,
            "manager_breakdown": Dict
        }
    """
    results = {}
    
    # 1. Оценка ценности (Value)
    try:
        value_result = _evaluate_value(transcript_text, direction)
        results.update(value_result)
    except Exception as e:
        print(f"Error evaluating value: {e}")
        results["value_score"] = 0
        results["value_explanation"] = f"Ошибка оценки: {e}"
    
    # Убеждаемся, что value_score всегда int или None
    if "value_score" in results and results["value_score"] is not None:
        try:
            results["value_score"] = int(results["value_score"])
        except (ValueError, TypeError):
            results["value_score"] = 0

    # 2. Проверяем порог ценности для оценки качества
    value_score = results.get("value_score", 0)
    try:
        threshold_str = get_prompt("quality_min_value_threshold", "0")
        threshold = int(threshold_str) if threshold_str else 0
    except (ValueError, TypeError):
        threshold = 0
    
    # 3. Оценка качества менеджера (Quality) - только если ценность >= порога
    if value_score >= threshold:
        try:
            quality_result = _evaluate_quality(transcript_text)
            results.update(quality_result)
            # Убеждаемся, что is_quality_analyzable всегда булевое значение
            if "is_quality_analyzable" in results and results["is_quality_analyzable"] is None:
                results["is_quality_analyzable"] = False
            elif "is_quality_analyzable" not in results:
                results["is_quality_analyzable"] = True
        except Exception as e:
            print(f"Error evaluating quality: {e}")
            results["is_quality_analyzable"] = False
            results["not_analyzable_reason"] = f"Ошибка оценки: {e}"
            results["manager_score"] = None
            results["manager_feedback"] = None
            results["manager_breakdown"] = None
    else:
        print(f"--- [EVALUATION] Quality evaluation skipped: value_score ({value_score}) < threshold ({threshold}) ---")
        results["is_quality_analyzable"] = False
        results["not_analyzable_reason"] = f"Ценность звонка ({value_score}) ниже порога для оценки качества ({threshold})"
        results["manager_score"] = None
        results["manager_feedback"] = None
        results["manager_breakdown"] = None

    # 4. Рекомендации менеджеру (если включено)
    enable_recommendations = get_prompt("enable_manager_recommendations", "false").lower() == "true"
    if enable_recommendations:
        try:
            recommendations_result = generate_recommendations(transcript_text)
            results.update(recommendations_result)
        except Exception as e:
            print(f"Error evaluating recommendations: {e}")
            results["manager_recommendations"] = None
    else:
        results["manager_recommendations"] = None
    
    # Убеждаемся, что все обязательные поля присутствуют с правильными типами
    if "is_quality_analyzable" not in results:
        results["is_quality_analyzable"] = False
    
    # Убеждаемся, что manager_score всегда float или None
    if "manager_score" in results and results["manager_score"] is not None:
        try:
            results["manager_score"] = float(results["manager_score"])
        except (ValueError, TypeError):
            results["manager_score"] = None

    return results


def _evaluate_value(transcript_text: str, direction: str) -> Dict[str, Any]:
    """Оценивает ценность звонка."""
    
    # Выбираем промпт в зависимости от направления
    is_incoming = "входящий" in direction.lower() or "incoming" in direction.lower()
    
    # Получаем промпт из БД
    prompt_key = "value_incoming" if is_incoming else "value_outgoing"
    default_prompt = """Твоя роль: Эксперт по анализу продаж в b2b-сегменте ИТ-техники.

Задача: Оценить звонок по шкале от 1 до 5.

Текст разговора: {transcript_text}

ВАЖНО: Длина обоснования зависит от оценки:
- Если оценка 1 или 2: обоснование должно быть КРАТКИМ, не более 130 символов. Укажи только основную причину низкой оценки.
- Если оценка 3, 4 или 5: можешь дать развернутое обоснование без ограничений по длине.

Выведи ответ в формате JSON:
{
  "score": 5,
  "reason": "Обоснование оценки..."
}"""
    
    prompt_template = get_prompt(prompt_key, default_prompt)
    prompt = prompt_template.replace("{transcript_text}", transcript_text)
    
    print(f"--- [DEEPSEEK] Evaluating Value (Incoming: {is_incoming}) ---")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    
    content = _clean_json_response(response.choices[0].message.content)
    try:
        data = json.loads(content)
        value_score = data.get("score")
        value_explanation = data.get("reason")
        
        # Обрезка для низкоценных звонков (оценка < 3)
        if value_score and value_score < 3 and value_explanation:
            if len(value_explanation) > 130:
                # Обрезаем до 130 символов, стараясь не обрезать слово
                truncated = value_explanation[:127]  # 127 + "..." = 130
                last_space = truncated.rfind(' ')
                if last_space > 100:  # Если есть пробел не слишком близко к началу
                    value_explanation = truncated[:last_space] + "..."
                else:
                    value_explanation = truncated + "..."
                print(f"--- [DEEPSEEK] Truncated value_explanation to 130 chars for score {value_score} ---")
        
        return {
            "value_score": value_score,
            "value_explanation": value_explanation
        }
    except Exception as e:
        print(f"Error parsing value JSON: {e} -> {content}")
        return {"value_score": 0, "value_explanation": "Ошибка анализа"}


def _evaluate_quality(transcript_text: str) -> Dict[str, Any]:
    """Оценивает качество работы менеджера."""
    
    # Получаем промпт из БД
    default_prompt = """Твоя роль: Эксперт по обучению менеджеров продаж (b2b, ИТ-техника).

Задача: Оценить качество работы менеджера.

Текст разговора: {transcript_text}

Выведи ответ в формате JSON."""
    
    prompt_template = get_prompt("quality", default_prompt)
    prompt = prompt_template.replace("{transcript_text}", transcript_text)
    
    print(f"--- [DEEPSEEK] Evaluating Quality ---")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    
    content = _clean_json_response(response.choices[0].message.content)
    try:
        data = json.loads(content)
        
        # Рассчитываем средний балл если он не пришел (хотя промпт просит)
        if data.get("is_quality_analyzable") and not data.get("quality_score") and data.get("quality_breakdown"):
            scores = data["quality_breakdown"].values()
            if scores:
                data["quality_score"] = round(sum(scores) / len(scores), 1)

        # Убеждаемся, что is_quality_analyzable всегда булевое значение
        is_analyzable = bool(data.get("is_quality_analyzable", True))
        
        return {
            "is_quality_analyzable": is_analyzable,
            "not_analyzable_reason": data.get("reason") if not is_analyzable else None,
            "manager_score": data.get("quality_score"),
            "manager_feedback": data.get("quality_feedback"),
            "manager_breakdown": data.get("quality_breakdown")
        }
    except Exception as e:
        print(f"Error parsing quality JSON: {e} -> {content}")
        return {"is_quality_analyzable": False, "not_analyzable_reason": "Ошибка анализа"}


def generate_recommendations(transcript_text: str, history_context: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Генерирует рекомендации для менеджера с учетом истории и контекста звонка."""
    transcript_stripped = (transcript_text or "").strip()
    # Слишком короткий или пустой диалог — не тратим запрос, возвращаем явный ответ
    if len(transcript_stripped) < 80:
        return {
            "manager_recommendations": [
                "Недостаточно текста разговора для рекомендаций. Нужен диалог с репликами клиента и менеджера."
            ]
        }

    # Получаем промпт из БД, но используем улучшенный дефолт если промпт из БД слишком общий
    default_prompt = """Твоя роль: Опытный наставник по B2B продажам.

КРИТИЧЕСКИ ВАЖНО: Рекомендации должны быть СТРОГО привязаны к ЭТОМУ КОНКРЕТНОМУ разговору.

ПРАВИЛА:
1. ОБЯЗАТЕЛЬНО используй конкретные детали из диалога: имена людей, названия товаров/услуг, суммы, сроки, компании, проблемы, которые упоминались.
2. Каждый вопрос должен содержать отсылку к конкретной теме или реплике из разговора выше.
3. ЗАПРЕЩЕНО использовать общие шаблоны типа "какие три ключевых показателя", "кто еще в компании", "какой бюджет" — если эти темы НЕ обсуждались в диалоге.
4. Если в разговоре обсуждался товар X — задавай вопросы про товар X, а не про "решение" абстрактно.
5. Если клиент упомянул проблему Y — задавай вопросы про проблему Y, а не про "задачи" вообще.
6. Если в разговоре почти нет содержания (только приветствия) — верни: "В диалоге мало содержания для конкретных рекомендаций."

ПРИМЕР ПРАВИЛЬНОГО ВОПРОСА (если в диалоге говорили про серверы Dell):
"Вы упомянули, что рассматриваете серверы Dell. Какие конкретные модели вас интересуют и для каких задач они нужны?"

ПРИМЕР НЕПРАВИЛЬНОГО ВОПРОСА (слишком общий):
"Какие три ключевых показателя должны измениться в вашем отделе?" — это шаблон, не привязанный к диалогу.

Текст разговора (диалог менеджера и клиента):
---
{transcript_text}
---

Задача: Проанализируй диалог выше и предложи 3–5 конкретных вопросов, которые менеджер МОГ БЫ задать в этом разговоре, но не задал. Каждый вопрос должен содержать конкретные детали из диалога (имена, товары, проблемы, суммы и т.д.).

Формат ответа — только JSON:
{
  "recommendations": [
    "Вопрос 1 с конкретными деталями из диалога",
    "Вопрос 2 с конкретными деталями из диалога"
  ]
}"""
    
    db_prompt = get_prompt("manager_recommendations", default_prompt)
    
    # Если промпт из БД слишком общий (не содержит критических инструкций), используем улучшенный дефолт
    critical_keywords = ["СТРОГО", "конкретном", "ЭТОМУ", "ЗАПРЕЩЕНО", "вытекать из тем"]
    if not any(keyword in db_prompt for keyword in critical_keywords):
        print("--- [DEEPSEEK] DB prompt lacks context requirements, using enhanced default ---")
        prompt_template = default_prompt
    else:
        prompt_template = db_prompt
    
    # Логируем первые 200 символов транскрипта для диагностики
    transcript_preview = transcript_stripped[:200].replace('\n', ' ')
    print(f"--- [DEEPSEEK] Transcript preview (first 200 chars): {transcript_preview}... ---")
    
    # Формируем полный текст для анализа
    full_text_to_analyze = transcript_stripped
    
    # Если есть история, добавляем её в контекст
    if history_context and len(history_context) > 0:
        history_str = "ИСТОРИЯ ПРЕДЫДУЩИХ ЗВОНКОВ С ЭТИМ КЛИЕНТОМ:\n\n"
        # Берем в обратном порядке (от старых к новым) для естественного хода времени, 
        # но в списке они от новых к старым. Поэтому reversed.
        for call in reversed(history_context):
            history_str += f"--- Звонок от {call.get('date')} ({call.get('direction')}) ---\n"
            history_str += f"Менеджер: {call.get('manager')}\n"
            # Обрезаем слишком длинные транскрипты истории, чтобы влезть в контекст
            text = call.get('text', '')
            if len(text) > 1500:
                text = text[:1500] + "... (обрезано)"
            history_str += f"{text}\n\n"
        
        history_str += "--- ТЕКУЩИЙ ЗВОНОК (ДЛЯ КОТОРОГО НУЖНЫ РЕКОМЕНДАЦИИ) ---\n"
        full_text_to_analyze = history_str + transcript_stripped

    prompt = prompt_template.replace("{transcript_text}", full_text_to_analyze)
    
    import logging
    logger = logging.getLogger(__name__)
    
    # Логируем используемый ключ (первые и последние 10 символов для безопасности)
    api_key = client.api_key
    if api_key:
        key_preview = f"{api_key[:10]}...{api_key[-10:]}" if len(api_key) > 20 else api_key[:20]
        print(f"--- [DEEPSEEK] Using API key: {key_preview} (length: {len(api_key)}) ---")
        logger.error(f"--- [DEEPSEEK] Using API key: {key_preview} (length: {len(api_key)}) ---")
    else:
        print("--- [DEEPSEEK] WARNING: API key is EMPTY! ---")
        logger.error("--- [DEEPSEEK] WARNING: API key is EMPTY! ---")
    
    logger.info("--- [DEEPSEEK] Generating Recommendations ---")
    print(f"--- [DEEPSEEK] Generating Recommendations (transcript length: {len(transcript_stripped)} chars) ---")
    
    try:
        # Используем более высокую temperature для большей вариативности и system message для усиления контекста
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "Ты анализируешь конкретный разговор и предлагаешь вопросы, строго привязанные к его содержанию. Каждый разговор уникален — рекомендации должны отражать именно этот диалог, а не общие шаблоны."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7  # Увеличено с 0.4 для большей вариативности
        )
    except Exception as api_error:
        # Пробрасываем ошибки API наверх для обработки в роутере
        print(f"--- [DEEPSEEK] API Error: {api_error} ---")
        raise api_error
    
    content = _clean_json_response(response.choices[0].message.content)
    try:
        data = json.loads(content)
        recommendations = data.get("recommendations", [])
        # Если пришла строка, пробуем разбить
        if isinstance(recommendations, str):
            recommendations = [recommendations]
        
        # Проверка на слишком общие рекомендации (шаблонные фразы)
        generic_patterns = [
            "три ключевых показателя",
            "кто еще в компании",
            "какой бюджет",
            "какой процесс",
            "какой срок",
            "какие скрытые издержки",
            "какой был бы реалистичный"
        ]
        
        # Если все рекомендации содержат только общие шаблоны, логируем предупреждение
        all_generic = all(
            any(pattern.lower() in rec.lower() for pattern in generic_patterns)
            for rec in recommendations
            if isinstance(rec, str) and len(rec) > 20
        )
        
        if all_generic and len(recommendations) > 0:
            print(f"--- [DEEPSEEK] WARNING: Recommendations appear generic. Transcript length: {len(transcript_stripped)} ---")
            print(f"--- [DEEPSEEK] First recommendation: {recommendations[0][:100] if recommendations else 'N/A'} ---")
            
        return {
            "manager_recommendations": recommendations
        }
    except Exception as e:
        print(f"Error parsing recommendations JSON: {e} -> {content}")
        return {"manager_recommendations": []}


def _clean_json_response(content: str) -> str:
    """Очищает ответ от markdown и лишнего."""
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        # Ищем начало и конец JSON
        start = 0
        end = len(lines)
        if lines[0].startswith("```"):
            start = 1
        if lines[-1].startswith("```"):
            end = -1
        content = "\n".join(lines[start:end])
    
    content = content.replace("```json", "").replace("```", "").strip()
    
    # Обрезаем до json блока если есть мусор вокруг
    start_idx = content.find('{')
    end_idx = content.rfind('}')
    if start_idx != -1 and end_idx != -1:
        content = content[start_idx:end_idx+1]
        
    return content

