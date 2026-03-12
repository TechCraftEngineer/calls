"""Хранилище данных на основе SQLite."""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from werkzeug.security import generate_password_hash, check_password_hash

# Paths adjusted for backend location
# In Docker container: /app/data, on VPS/server: project root / data
# Check if we're in Docker container
import os
# Проверяем переменную окружения (приоритет) или наличие .dockerenv (надежный индикатор Docker контейнера)
deployment_env = os.getenv("DEPLOYMENT_ENV", "").lower()
is_docker = (
    deployment_env == "docker" or
    Path("/.dockerenv").exists() or
    (os.name != 'nt' and Path("/app").exists() and Path("/app").is_absolute())
)
if is_docker:
    # Docker container (Unix-like system)
    DATA_DIR = Path("/app/data")
else:
    # Local development or VPS server: one DB for project — backend/data
    # __file__ is backend/app/services/storage.py -> parent.parent.parent.parent = project root
    DATA_DIR = Path(__file__).parent.parent.parent.parent / "backend" / "data"
DB_FILE = DATA_DIR / "db.sqlite"
logger = logging.getLogger(__name__)
CALLS_FILE = DATA_DIR / "calls.json"
TRANSCRIPTS_FILE = DATA_DIR / "transcripts.json"
ACTIVITY_LOG_FILE = DATA_DIR / "activity_log.json"


def ensure_data_dir():
    """Создаёт папку data если её нет."""
    DATA_DIR.mkdir(exist_ok=True)


def normalize_phone(val: str) -> str:
    """
    Нормализует номер телефона: убирает + в начале, 8XXXXXXXXXX заменяет на 7XXXXXXXXXX.
    """
    if not val or not isinstance(val, str):
        return (val or "").strip()
    s = val.strip()
    if s.startswith("+"):
        s = s[1:]
    if s.startswith("8") and len(s) == 11:
        s = "7" + s[1:]
    return s


def _looks_like_phone(s: str) -> bool:
    """Проверяет, похожа ли строка на российский номер (+7..., 8..., 7...)."""
    s = (s or "").strip()
    if not s or len(s) < 10:
        return False
    cleaned = s.lstrip("+").replace(" ", "").replace("-", "")
    if len(cleaned) == 11 and cleaned[0] in ("7", "8") and cleaned.isdigit():
        return True
    return False


def normalize_numbers_csv(value: Optional[str], is_mobile: bool = False) -> Optional[str]:
    """
    Нормализует список номеров/идентификаторов через запятую.
    - mobile_numbers: всегда нормализуем каждый элемент как телефон
    - internal_numbers: нормализуем только номера (+7, 8...), идентификаторы (admin, ovchinnikov_nikita) оставляем
    """
    if not value or not value.strip():
        return value
    parts = [p.strip() for p in value.split(",") if p.strip()]
    if not parts:
        return value
    result = []
    for p in parts:
        if is_mobile or _looks_like_phone(p):
            result.append(normalize_phone(p))
        else:
            result.append(p)
    return ", ".join(result)


class SQLiteStorage:
    """Хранилище данных на основе SQLite."""

    def __init__(self):
        ensure_data_dir()
        self._init_db()
        self._migrate_from_json_if_needed()

    def _get_connection(self):
        conn = sqlite3.connect(DB_FILE, detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row
        # Убеждаемся, что используется UTF-8
        conn.execute("PRAGMA encoding = 'UTF-8'")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS calls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT UNIQUE,
                    number TEXT,
                    timestamp TEXT,
                    name TEXT,
                    duration INTEGER,
                    direction TEXT,
                    status TEXT,
                    size_bytes INTEGER,
                    internal_number TEXT
                )
            """)
            
            # Добавляем поле internal_number если его нет
            try:
                conn.execute("ALTER TABLE calls ADD COLUMN internal_number TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            # Добавляем поле source если его нет
            try:
                conn.execute("ALTER TABLE calls ADD COLUMN source TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            # Добавляем поле customer_name если его нет
            try:
                conn.execute("ALTER TABLE calls ADD COLUMN customer_name TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            conn.execute("""
                CREATE TABLE IF NOT EXISTS transcripts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    call_id INTEGER,
                    text TEXT,
                    title TEXT,
                    sentiment TEXT,
                    confidence REAL,
                    summary TEXT,
                    size_kb REAL,
                    FOREIGN KEY(call_id) REFERENCES calls(id) ON DELETE CASCADE
                )
            """)
            # Добавляем новые поля в transcripts если их нет
            try:
                conn.execute("ALTER TABLE transcripts ADD COLUMN caller_name TEXT")
            except sqlite3.OperationalError:
                pass
            try:
                conn.execute("ALTER TABLE transcripts ADD COLUMN call_type TEXT")
            except sqlite3.OperationalError:
                pass
            try:
                conn.execute("ALTER TABLE transcripts ADD COLUMN call_topic TEXT")
            except sqlite3.OperationalError:
                pass
            
            # Добавляем поле raw_text если его нет
            try:
                conn.execute("ALTER TABLE transcripts ADD COLUMN raw_text TEXT")
            except sqlite3.OperationalError:
                pass
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    level TEXT,
                    message TEXT,
                    actor TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    internal_numbers TEXT
                )
            """)
            
            # Добавляем поле internal_numbers если его нет
            try:
                conn.execute("ALTER TABLE users ADD COLUMN internal_numbers TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            # Добавляем поля first_name и last_name если их нет
            try:
                conn.execute("ALTER TABLE users ADD COLUMN first_name TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN last_name TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            # Добавляем поле mobile_numbers если его нет (для номеров Мегафон)
            try:
                conn.execute("ALTER TABLE users ADD COLUMN mobile_numbers TEXT")
            except sqlite3.OperationalError:
                pass  # Поле уже существует
            
            # Добавляем поля для Telegram интеграции
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_chat_id TEXT")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_daily_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_manager_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass

            try:
                conn.execute("ALTER TABLE users ADD COLUMN max_chat_id TEXT")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN max_daily_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN max_manager_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_connect_token TEXT")
            except sqlite3.OperationalError:
                pass

            try:
                conn.execute("ALTER TABLE users ADD COLUMN max_connect_token TEXT")
            except sqlite3.OperationalError:
                pass

            # Добавляем поля для фильтрации отчетов
            try:
                conn.execute("ALTER TABLE users ADD COLUMN filter_exclude_answering_machine INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass

            try:
                conn.execute("ALTER TABLE users ADD COLUMN filter_min_duration INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass

            try:
                conn.execute("ALTER TABLE users ADD COLUMN filter_min_replicas INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
            
            # Добавляем новые поля для отчетов и email
            try:
                conn.execute("ALTER TABLE users ADD COLUMN email TEXT")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_weekly_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_monthly_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN email_daily_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN email_weekly_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN email_monthly_report INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            # Добавляем настраиваемые параметры отчетов
            try:
                conn.execute("ALTER TABLE users ADD COLUMN report_include_call_summaries INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN report_detailed INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN report_include_avg_value INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN report_include_avg_rating INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            # Добавляем поля для расчета KPI
            try:
                conn.execute("ALTER TABLE users ADD COLUMN kpi_base_salary INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN kpi_target_bonus INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
                
            try:
                conn.execute("ALTER TABLE users ADD COLUMN kpi_target_talk_time_minutes INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN telegram_skip_weekends INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
            
            try:
                conn.execute("ALTER TABLE users ADD COLUMN report_managed_user_ids TEXT")
            except sqlite3.OperationalError:
                pass
            
            # Миграция: разделяем существующие имена на first_name и last_name
            try:
                cursor = conn.execute("SELECT id, name FROM users WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL AND name != ''")
                for row in cursor.fetchall():
                    user_id = row['id']
                    full_name = row['name'].strip()
                    # Разделяем имя и фамилию (берем первое слово как имя, остальное как фамилию)
                    parts = full_name.split(maxsplit=1)
                    first_name = parts[0] if parts else ''
                    last_name = parts[1] if len(parts) > 1 else ''
                    conn.execute("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?", (first_name, last_name, user_id))
                conn.commit()
            except Exception as e:
                print(f"Migration warning: {e}")
                pass
            
            # Таблица для хранения промптов
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prompts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    description TEXT,
                    updated_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS call_evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    call_id INTEGER NOT NULL UNIQUE,
                    is_quality_analyzable INTEGER DEFAULT 1,
                    not_analyzable_reason TEXT,
                    value_score INTEGER,
                    value_explanation TEXT,
                    manager_score REAL,
                    manager_feedback TEXT,
                    manager_breakdown TEXT,
                    manager_recommendations TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(call_id) REFERENCES calls(id) ON DELETE CASCADE
                )
            """)
            
            # Добавляем поле manager_recommendations если его нет
            try:
                conn.execute("ALTER TABLE call_evaluations ADD COLUMN manager_recommendations TEXT")
            except sqlite3.OperationalError:
                pass

            conn.commit()
            
            # Инициализируем промпты по умолчанию
            self._init_default_prompts()
            
            # Создаем администратора по умолчанию, если его нет
            self._create_default_admin()

    def _init_default_prompts(self):
        """Инициализирует промпты по умолчанию, если их нет."""
        transcribe_default = """Транскрибируй этот аудиофайл. Верни только текст разговора с разделением по репликам.

ВАЖНО: В разговоре участвуют ДВА человека - оператор и клиент. Обязательно различай двух спикеров и указывай правильное имя/обозначение перед каждой репликой.

Если указано имя оператора, используй именно его для реплик оператора.
Для реплик клиента: если клиент представился (назвал своё имя, фамилию, название организации или компании), используй это имя/название вместо слова «Клиент» (например: «Иван Петров: ...» или «ООО Компания: ...»). Если клиент не представился, используй обозначение «Клиент».

Если имя оператора не указано, обозначай собеседников как «Оператор» и «Клиент» (или «Спикер 1/2», если роль неочевидна), но всё равно пытайся определить имя/название клиента, если он представился.

Каждая реплика должна начинаться с указания спикера в формате: "Имя/Обозначение: текст реплики"."""

        speaker_analysis_base = """АНАЛИЗ РАЗГОВОРА И ОПРЕДЕЛЕНИЕ СПИКЕРОВ

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

ВЕРНИ ТОЛЬКО ОТФОРМАТИРОВАННЫЙ ДИАЛОГ. Сохрани ВСЕ реплики из исходного транскрипта."""

        customer_name_extraction_default = """ОПРЕДЕЛЕНИЕ ИМЕНИ ЗАКАЗЧИКА

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
- НЕ возвращай названия компаний, организаций, ООО, ИП и т.д.
- НЕ возвращай QBS, КБС, Кью Би ЭС и их варианты написания
- НЕ возвращай имя менеджера ({manager_name})
- Если заказчик представился только названием компании (без имени), верни null
- Если имя не найдено, верни null

АВТООТВЕТЧИК:
Если вместо живого заказчика в транскрипте слышен голос автоответчика (робота), фразы типа:
- "Вас приветствует компания..."
- "Здравствуйте, вы позвонили в..."
- "К сожалению, абонент не может ответить..."
- "Оставьте ваше сообщение после сигнала..."
- "Переадресация вызова..."
И при этом в разговоре НЕТ живого диалога с человеком, верни "Автоответчик".

ТРАНСКРИПТ РАЗГОВОРА:
{transcript_text}

ВЕРНИ ОТВЕТ ТОЛЬКО В JSON ФОРМАТЕ:
{{
  "customer_name": "имя заказчика" или "Автоответчик" или null
}}"""

        default_prompts = {
            "transcribe": {
                "value": transcribe_default,
                "description": "Промпт для транскрибации аудиофайлов (по умолчанию)"
            },
            "transcribe_incoming": {
                "value": transcribe_default,
                "description": "Промпт для транскрибации ВХОДЯЩИХ звонков"
            },
            "transcribe_outgoing": {
                "value": transcribe_default,
                "description": "Промпт для транскрибации ИСХОДЯЩИХ звонков"
            },
            "gemini_model": {
                "value": "gemini-2.0-flash",
                "description": "Модель для транскрибации (gemini-2.0-pro, gemini-2.0-flash)"
            },
            "speaker_analysis": {
                "value": speaker_analysis_base,
                "description": "Промпт для анализа спикеров (универсальный)"
            },
            "speaker_analysis_incoming": {
                "value": speaker_analysis_base.replace("КОНТЕКСТ:", "КОНТЕКСТ: Это ВХОДЯЩИЙ звонок. Клиент/поставщик звонит в QBS. Оператор QBS [имя менеджера] отвечает на звонок.\n"),
                "description": "Промпт для анализа спикеров (входящий)"
            },
            "speaker_analysis_outgoing": {
                "value": speaker_analysis_base.replace("КОНТЕКСТ:", "КОНТЕКСТ: Это ИСХОДЯЩИЙ звонок. Оператор QBS [имя менеджера] звонит клиенту/поставщику.\n"),
                "description": "Промпт для анализа спикеров (исходящий)"
            },
            "customer_name_extraction": {
                "value": customer_name_extraction_default,
                "description": "Промпт для извлечения имени заказчика из транскрипта"
            },
            "summary": {
                "value": """Проанализируй следующий разговор и выполни комплексную задачу по классификации и суммаризации.

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
{
  "caller_name": "... или null",
  "call_type": "Клиент / Поставщик / Реклама / Незнакомый / Техподдержка / Сотрудник",
  "call_topic": "...",
  "title": "...",
  "sentiment": "Позитивный / Нейтральный / Негативный",
  "confidence": 0.0,
  "summary": "..."
}

ТЕКСТ РАЗГОВОРА ДЛЯ АНАЛИЗА:
{transcript_text}""",
                "description": "Промпт для генерации саммари разговора (расширенный)"
            },
            "value_incoming": {
                "value": """Твоя роль: Эксперт по анализу продаж в b2b-сегменте ИТ-техники.

ВАЖНО: Все ответы должны быть ТОЛЬКО на русском языке. 
Избегай англицизмов и английских аббревиатур. 
Используй русские эквиваленты:
- "лицо, принимающее решения" или "ЛПР" вместо "LPR" или "decision maker"
- "индивидуальный предприниматель" или "ИП" вместо "individual entrepreneur" или "IE"
- "коммерческое предложение" или "КП" вместо "commercial proposal" или "CP"
- "бизнес-процесс" вместо "business process"
- "следующий шаг" вместо "next step"
- "обратная связь" вместо "feedback"
И так далее для всех терминов. Все тексты обоснований, обратной связи и объяснений должны быть полностью на русском языке без англицизмов.

Задача: Оценить входящий звонок от потенциального клиента по шкале от 1 до 5.

Критерии оценки:
1 (Низкая): Общие справочные вопросы ("есть ли товар?", "цена?"). Клиент анонимен. Следующий шаг не определен.
2 (Потенциальная): Запрос по конкретной позиции. Клиент представился. Отправлено КП, но следующий шаг не согласован.
3 (Средняя / Квалифицированный лид): Обсуждение потребности (например, "нужно 10 ПК для отдела"). Выявлены требования. Согласовано КП с четким сроком и дальнейшим контактом.
4 (Высокая / Горячий лид): Обсуждение деталей сделки (спецификации, скидки, постоплата). Согласованы шаги к закрытию (счет, встреча, демонстрация).
5 (Максимальная): Звонок для оформления заказа. Сделка заключена или переведена на стадию счета/договора.

Тип звонка: ВХОДЯЩИЙ
Текст разговора: {transcript_text}

Инструкция:
1. Проанализируй диалог.
2. Определи, насколько запрос был конкретным.
3. Определи, был ли согласован четкий следующий шаг.
4. Выведи ответ в формате JSON:
{
  "score": 5,
  "reason": "Краткое обоснование..."
}""",
                "description": "Промпт для оценки ценности входящих звонков"
            },
            "value_outgoing": {
                "value": """Твоя роль: Эксперт по анализу продаж в b2b-сегменте ИТ-техники.

ВАЖНО: Все ответы должны быть ТОЛЬКО на русском языке. 
Избегай англицизмов и английских аббревиатур. 
Используй русские эквиваленты:
- "лицо, принимающее решения" или "ЛПР" вместо "LPR" или "decision maker"
- "индивидуальный предприниматель" или "ИП" вместо "individual entrepreneur" или "IE"
- "коммерческое предложение" или "КП" вместо "commercial proposal" или "CP"
- "бизнес-процесс" вместо "business process"
- "следующий шаг" вместо "next step"
- "обратная связь" вместо "feedback"
И так далее для всех терминов. Все тексты обоснований, обратной связи и объяснений должны быть полностью на русском языке без англицизмов.

Задача: Оценить исходящий звонок (холодный/теплый) по шкале от 1 до 5.

Критерии оценки:
1 (Низкая): Монолог менеджера, отказ, недозвон. Потребность не выявлена.
2 (Потенциальная): Установлен контакт. Согласие на получение информации (прайс). Потребность не ясна, следующий шаг размыт.
3 (Средняя / Квалификация): Менеджер задавал открытые вопросы и выявил потребность. Определен ЛПР. Согласовано действие — подготовка персонального КП.
4 (Высокая / Продвижение): Обсуждение отправленного КП, работа с возражениями. Согласован шаг к сделке: встреча, тест, разговор с техспециалистом.
5 (Максимальная): Закрытие сделки или получение твердого согласия. Инициирован процесс оформления документов.

Тип звонка: ИСХОДЯЩИЙ
Текст разговора: {transcript_text}

Инструкция:
1. Проанализируй диалог.
2. Определи, насколько менеджер контролировал разговор и выявлял потребность.
3. Определи, был ли согласован конкретный следующий шаг.
4. Выведи ответ в формате JSON:
{
  "score": 5,
  "reason": "Краткое обоснование..."
}""",
                "description": "Промпт для оценки ценности исходящих звонков"
            },
            "quality": {
                "value": """Твоя роль: Эксперт по обучению менеджеров продаж (b2b, ИТ-техника).

ВАЖНО: Все ответы должны быть ТОЛЬКО на русском языке. 
Избегай англицизмов и английских аббревиатур. 
Используй русские эквиваленты:
- "лицо, принимающее решения" или "ЛПР" вместо "LPR" или "decision maker"
- "индивидуальный предприниматель" или "ИП" вместо "individual entrepreneur" или "IE"
- "коммерческое предложение" или "КП" вместо "commercial proposal" или "CP"
- "бизнес-процесс" вместо "business process"
- "следующий шаг" вместо "next step"
- "обратная связь" вместо "feedback"
И так далее для всех терминов. Все тексты обоснований, обратной связи и объяснений должны быть полностью на русском языке без англицизмов.

Задача:
1. Определи пригодность разговора для оценки качества (фильтр нерелевантных кейсов).
2. Если пригоден — оцени навыки менеджера по 5 критериям (шкала 1-5).

Критерии НЕПРИГОДНОСТИ (когда оценивать НЕ надо):
- Крайне короткий диалог (< 4 реплик или < 30 сек).
- Монолог (автоответчик, голосовая почта).
- Непродажный разговор (уточнение доставки, разговор с курьером/коллегой).
- Клиенту неудобно ("Я за рулем", "Перезвоните").
- Неустановленный контакт (помехи, сброс).

Если разговор пригоден, оцени по 5 критериям:
1. Выявление потребности (открытые вопросы, детали).
2. Аргументация (выгоды, кейсы).
3. Работа с возражениями (не игнорировал, предлагал решения).
4. Управление разговором (инициатива, резюме, следующий шаг).
5. Профессионализм (этика, уверенность).

Текст разговора: {transcript_text}

ВЫВЕДИ JSON:

Сценарий А (Не пригоден):
{
  "is_quality_analyzable": false,
  "reason": "Причина (например: Автоответчик)",
  "quality_score": null,
  "quality_breakdown": null,
  "quality_feedback": null
}

Сценарий Б (Пригоден):
{
  "is_quality_analyzable": true,
  "reason": "Содержательный диалог",
  "quality_score": 4.2, 
  "quality_breakdown": {
    "needs_analysis": 5,
    "argumentation": 4,
    "objection_handling": 3,
    "conversation_control": 5,
    "professionalism": 4
  },
  "quality_feedback": "Текст отзыва..."
}""",
                "description": "Промпт для оценки качества работы менеджера"
            },
            "manager_recommendations": {
                "value": """Твоя роль: Опытный наставник по B2B продажам.

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

Текст разговора:
---
{transcript_text}
---

Задача: Проанализируй диалог выше и предложи 3–5 конкретных вопросов, которые менеджер МОГ БЫ задать в этом разговоре, но не задал. Каждый вопрос должен содержать конкретные детали из диалога (имена, товары, проблемы, суммы и т.д.).

Формат ответа — только JSON:
{
  "recommendations": ["Вопрос 1 с конкретными деталями из диалога", "Вопрос 2 с конкретными деталями из диалога"]
}""",
                "description": "Промпт для генерации рекомендаций менеджеру (привязанных к контексту звонка, с требованием использовать конкретные детали)"
            },
            "enable_manager_recommendations": {
                "value": "false",
                "description": "Включить генерацию рекомендаций для менеджера (true/false)"
            },
            "quality_min_value_threshold": {
                "value": "0",
                "description": "Минимальная ценность звонка для оценки качества (0-5). Оценка качества будет выполняться только для звонков с ценностью >= этого значения."
            },
            "telegram_bot_token": {
                "value": "",
                "description": "Токен Telegram бота для отправки отчетов"
            },
            "max_bot_token": {
                "value": "",
                "description": "Токен MAX-бота для отправки отчётов"
            }
        }
        
        with self._get_connection() as conn:
            for key, data in default_prompts.items():
                cursor = conn.execute("SELECT COUNT(*) FROM prompts WHERE key = ?", (key,))
                if cursor.fetchone()[0] == 0:
                    conn.execute("""
                        INSERT INTO prompts (key, value, description, updated_at)
                        VALUES (?, ?, ?, ?)
                    """, (key, data["value"], data["description"], datetime.now().isoformat()))
            conn.commit()
    
    def _create_default_admin(self):
        """Создает администратора по умолчанию, если его нет."""
        import os
        default_pw = os.environ.get("DEFAULT_ADMIN_PASSWORD", "")
        if not default_pw:
            default_pw = "admin123"  # Только для первой инициализации; смените через /users
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM users WHERE username = ?", ("admin@mango",))
            if cursor.fetchone()[0] == 0:
                password_hash = generate_password_hash(default_pw)
                created_at = datetime.now().isoformat()
                conn.execute("""
                    INSERT INTO users (username, password_hash, name, created_at, is_active, internal_numbers)
                    VALUES (?, ?, ?, ?, 1, ?)
                """, ("admin@mango", password_hash, "Администратор", created_at, "all"))
                conn.commit()
            else:
                # Обновляем существующего админа, если у него нет internal_numbers или он не равен "all"
                cursor = conn.execute("SELECT internal_numbers FROM users WHERE username = ?", ("admin@mango",))
                row = cursor.fetchone()
                current_internal_numbers = row[0] if row and row[0] else None
                if not current_internal_numbers or current_internal_numbers.strip() != "all":
                    conn.execute("""
                        UPDATE users SET internal_numbers = 'all' WHERE username = ?
                    """, ("admin@mango",))
                    conn.commit()

    def _migrate_from_json_if_needed(self):
        """Миграция данных из JSON, если база пустая."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM calls")
            if cursor.fetchone()[0] > 0:
                return  # База не пустая

            print("Миграция данных из JSON в SQLite...")
            
            # Миграция звонков
            if CALLS_FILE.exists():
                try:
                    with open(CALLS_FILE, "r", encoding="utf-8") as f:
                        calls = json.load(f)
                        for call in calls:
                            # Обработка timestamp
                            ts = call.get("timestamp")
                            # Если timestamp уже строка, оставляем как есть, если datetime (вряд ли из json.load), конвертируем
                            
                            cursor.execute("""
                                INSERT OR IGNORE INTO calls (id, filename, number, timestamp, name, duration, direction, status, size_bytes, internal_number)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                call.get("id"),
                                call.get("filename"),
                                call.get("number"),
                                ts,
                                call.get("name"),
                                call.get("duration", 0),
                                call.get("direction"),
                                call.get("status"),
                                call.get("size_bytes", 0),
                                call.get("internal_number")
                            ))
                except Exception as e:
                    print(f"Ошибка миграции calls.json: {e}")

            # Миграция транскриптов
            if TRANSCRIPTS_FILE.exists():
                try:
                    with open(TRANSCRIPTS_FILE, "r", encoding="utf-8") as f:
                        transcripts = json.load(f)
                        for t in transcripts:
                            cursor.execute("""
                                INSERT OR IGNORE INTO transcripts (id, call_id, text, title, sentiment, confidence, summary, size_kb)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                t.get("id"),
                                t.get("call_id"),
                                t.get("text"),
                                t.get("title"),
                                t.get("sentiment"),
                                t.get("confidence"),
                                t.get("summary"),
                                t.get("size_kb")
                            ))
                except Exception as e:
                    print(f"Ошибка миграции transcripts.json: {e}")

            # Миграция логов
            if ACTIVITY_LOG_FILE.exists():
                try:
                    with open(ACTIVITY_LOG_FILE, "r", encoding="utf-8") as f:
                        logs = json.load(f)
                        # Инвертируем порядок, чтобы старые были первыми при вставке (если JSON отсортирован DESC)
                        # JSONStorage добавляет в начало (insert(0, entry)), значит в файле новые сверху.
                        # Нам лучше вставлять хронологически, или просто вставить все.
                        # Activity log не имеет ID в JSON, так что порядок вставки определит ID.
                        # Если мы хотим сохранить порядок (по ID), лучше вставлять от старых к новым.
                        for log in reversed(logs):
                             cursor.execute("""
                                INSERT INTO activity_log (timestamp, level, message, actor)
                                VALUES (?, ?, ?, ?)
                            """, (
                                log.get("timestamp"),
                                log.get("level"),
                                log.get("message"),
                                log.get("actor")
                            ))
                except Exception as e:
                    print(f"Ошибка миграции activity_log.json: {e}")
            
            conn.commit()

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        return dict(row)

    def _parse_timestamp(self, ts: Any) -> Any:
        if isinstance(ts, str):
            try:
                # Обработка разных форматов
                if "T" in ts:
                    return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                else:
                    return datetime.fromisoformat(ts)
            except (ValueError, TypeError):
                return ts
        return ts

    @property
    def calls(self) -> List[Dict[str, Any]]:
        """Возвращает список всех звонков."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM calls ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                result.append(d)
            return result

    @property
    def transcripts(self) -> List[Dict[str, Any]]:
        """Возвращает список всех транскриптов."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM transcripts")
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    @property
    def activity_log(self) -> List[Dict[str, Any]]:
        """Возвращает журнал событий."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100")
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                result.append(d)
            return result

    def save_calls(self):
        """Не используется в SQLite версии (автосохранение)."""
        pass

    def save_transcripts(self):
        """Не используется в SQLite версии (автосохранение)."""
        pass

    def save_activity_log(self):
        """Не используется в SQLite версии (автосохранение)."""
        pass

    def get_calls_with_transcripts(
        self,
        limit: int = 100,
        offset: int = 0,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        internal_numbers: Optional[List[str]] = None,
        mobile_numbers: Optional[List[str]] = None,
        direction: Optional[str] = None,
        value_scores: Optional[List[int]] = None,
        operators: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Возвращает список звонков вместе с транскриптами и оценками (оптимизация N+1)."""
        with self._get_connection() as conn:
            sql = """
                SELECT 
                    c.*,
                    t.id as transcript_id,
                    t.text as transcript_text,
                    t.raw_text as transcript_raw_text,
                    t.title as transcript_title,
                    t.sentiment as transcript_sentiment,
                    t.confidence as transcript_confidence,
                    t.summary as transcript_summary,
                    t.size_kb as transcript_size_kb,
                    t.caller_name as transcript_caller_name,
                    t.call_type as transcript_call_type,
                    t.call_topic as transcript_call_topic,
                    ce.id as eval_id,
                    ce.value_score as eval_value_score,
                    ce.value_explanation as eval_value_explanation,
                    ce.manager_score as eval_manager_score,
                    ce.manager_feedback as eval_manager_feedback,
                    ce.manager_recommendations as eval_manager_recommendations,
                    ce.is_quality_analyzable as eval_is_quality_analyzable
                FROM calls c
                LEFT JOIN transcripts t ON c.id = t.call_id
                LEFT JOIN call_evaluations ce ON c.id = ce.call_id
            """
            
            sql += " WHERE 1=1"
            params = []
            
            if date_from:
                sql += " AND c.timestamp >= ?"
                params.append(date_from)
            
            if date_to:
                sql += " AND c.timestamp <= ?"
                params.append(date_to)
            
            # Фильтрация по внутренним номерам (Mango) и/или мобильным (Megafon)
            if internal_numbers or mobile_numbers:
                parts = []
                if internal_numbers:
                    ph = ','.join(['?'] * len(internal_numbers))
                    parts.append(f"c.internal_number IN ({ph})")
                    params.extend(internal_numbers)
                if mobile_numbers:
                    ph = ','.join(['?'] * len(mobile_numbers))
                    parts.append(f"c.number IN ({ph})")
                    params.extend(mobile_numbers)
                sql += " AND (" + " OR ".join(parts) + ")"
            
            if direction:
                sql += " AND c.direction = ?"
                params.append(direction)
            
            # Фильтрация по оператору
            if operators:
                placeholders = ','.join(['?'] * len(operators))
                sql += f" AND c.source IN ({placeholders})"
                params.extend(operators)
            
            # Фильтрация по ценности
            if value_scores:
                placeholders = ','.join(['?'] * len(value_scores))
                sql += f" AND ce.value_score IN ({placeholders})"
                params.extend(value_scores)
            
            sql += " ORDER BY c.timestamp DESC, c.id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                
                # Разделяем данные звонка, транскрипта и оценки
                call = {k: v for k, v in d.items() if not k.startswith("transcript_") and not k.startswith("eval_")}
                call["timestamp"] = self._parse_timestamp(call["timestamp"])
                
                transcript = None
                if d.get("transcript_id"):
                    transcript = {
                        "id": d["transcript_id"],
                        "call_id": call["id"],
                        "text": d["transcript_text"],
                        "raw_text": d.get("transcript_raw_text"),
                        "title": d["transcript_title"],
                        "sentiment": d["transcript_sentiment"],
                        "confidence": d["transcript_confidence"],
                        "summary": d["transcript_summary"],
                        "size_kb": d["transcript_size_kb"],
                        "caller_name": d.get("transcript_caller_name"),
                        "call_type": d.get("transcript_call_type"),
                        "call_topic": d.get("transcript_call_topic"),
                    }
                
                evaluation = None
                if d.get("eval_id"):
                    evaluation = {
                        "id": d["eval_id"],
                        "call_id": call["id"],
                        "value_score": d["eval_value_score"],
                        "value_explanation": d["eval_value_explanation"],
                        "manager_score": d["eval_manager_score"],
                        "manager_feedback": d["eval_manager_feedback"],
                        "manager_recommendations": d["eval_manager_recommendations"],
                        "is_quality_analyzable": d["eval_is_quality_analyzable"],
                    }
                    
                    if evaluation and evaluation.get("manager_recommendations"):
                        try:
                            evaluation["manager_recommendations"] = json.loads(evaluation["manager_recommendations"])
                        except (json.JSONDecodeError, TypeError):
                            pass
                            
                    if evaluation and evaluation.get("manager_breakdown"):
                        try:
                            evaluation["manager_breakdown"] = json.loads(d["eval_manager_breakdown"])
                        except (json.JSONDecodeError, TypeError):
                            pass
                
                result.append({"call": call, "transcript": transcript, "evaluation": evaluation})
            return result

    def get_call(self, call_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM calls WHERE id = ?", (call_id,))
            row = cursor.fetchone()
            if row:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                return d
            return None

    def add_call(self, call_data: Dict[str, Any]) -> int:
        with self._get_connection() as conn:
            ts = call_data.get("timestamp")
            if isinstance(ts, datetime):
                ts = ts.isoformat()
            
            # Если передан ID, используем его (важно для синхронизации, если она переписывает)
            # Но обычно add_call вызывается для новых.
            # В SQLiteStorage.add_call (который я пишу) я могу игнорировать переданный ID и использовать AUTOINCREMENT,
            # но JSONStorage логика использовала max_id + 1.
            
            cursor = conn.execute("""
                INSERT INTO calls (filename, number, timestamp, name, duration, direction, status, size_bytes, internal_number, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                call_data.get("filename"),
                call_data.get("number"),
                ts,
                call_data.get("name"),
                call_data.get("duration", 0),
                call_data.get("direction"),
                call_data.get("status"),
                call_data.get("size_bytes", 0),
                call_data.get("internal_number"),
                call_data.get("source")
            ))
            conn.commit()
            return cursor.lastrowid

    def update_call(self, call_id: int, updates: Dict[str, Any]) -> bool:
        with self._get_connection() as conn:
            fields = []
            values = []
            for k, v in updates.items():
                if k == "id": continue
                fields.append(f"{k} = ?")
                if isinstance(v, datetime):
                    values.append(v.isoformat())
                else:
                    values.append(v)
            
            if not fields:
                return False
                
            values.append(call_id)
            cursor = conn.execute(f"UPDATE calls SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_call(self, call_id: int) -> bool:
        with self._get_connection() as conn:
            # Включаем поддержку внешних ключей (по умолчанию может быть выключена в старых sqlite, но в python обычно ок)
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.execute("DELETE FROM calls WHERE id = ?", (call_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_transcript_by_call_id(self, call_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM transcripts WHERE call_id = ?", (call_id,))
            row = cursor.fetchone()
            return self._row_to_dict(row) if row else None

    def add_transcript(self, transcript_data: Dict[str, Any]) -> int:
        """Добавляет транскрипт для звонка. Если транскрипт уже существует, обновляет его."""
        with self._get_connection() as conn:
            call_id = transcript_data.get("call_id")
            # Проверяем, существует ли уже транскрипт для этого звонка
            cursor = conn.execute("SELECT id FROM transcripts WHERE call_id = ?", (call_id,))
            existing = cursor.fetchone()
            
            if existing:
                # Если транскрипт существует, обновляем его
                transcript_id = existing[0]
                cursor = conn.execute("""
                    UPDATE transcripts 
                    SET text = ?, raw_text = ?, title = ?, sentiment = ?, confidence = ?, summary = ?, 
                        size_kb = ?, caller_name = ?, call_type = ?, call_topic = ?
                    WHERE id = ?
                """, (
                    transcript_data.get("text"),
                    transcript_data.get("raw_text"),
                    transcript_data.get("title"),
                    transcript_data.get("sentiment"),
                    transcript_data.get("confidence"),
                    transcript_data.get("summary"),
                    transcript_data.get("size_kb"),
                    transcript_data.get("caller_name"),
                    transcript_data.get("call_type"),
                    transcript_data.get("call_topic"),
                    transcript_id
                ))
                conn.commit()
                return transcript_id
            else:
                # Если транскрипта нет, создаем новый
                cursor = conn.execute("""
                    INSERT INTO transcripts (call_id, text, raw_text, title, sentiment, confidence, summary, size_kb, caller_name, call_type, call_topic)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    call_id,
                    transcript_data.get("text"),
                    transcript_data.get("raw_text"),
                    transcript_data.get("title"),
                    transcript_data.get("sentiment"),
                    transcript_data.get("confidence"),
                    transcript_data.get("summary"),
                    transcript_data.get("size_kb"),
                    transcript_data.get("caller_name"),
                    transcript_data.get("call_type"),
                    transcript_data.get("call_topic")
                ))
                conn.commit()
                return cursor.lastrowid

    def update_transcript(self, transcript_id: int, updates: Dict[str, Any]) -> bool:
        with self._get_connection() as conn:
            fields = []
            values = []
            for k, v in updates.items():
                if k == "id": continue
                fields.append(f"{k} = ?")
                values.append(v)
            
            if not fields:
                return False
                
            values.append(transcript_id)
            cursor = conn.execute(f"UPDATE transcripts SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_transcript(self, transcript_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM transcripts WHERE id = ?", (transcript_id,))
            conn.commit()
            return cursor.rowcount > 0

    def add_evaluation(self, evaluation_data: Dict[str, Any]) -> int:
        """Добавляет оценку звонка."""
        with self._get_connection() as conn:
            # Преобразуем dict breakdown в JSON-строку если нужно
            breakdown = evaluation_data.get("manager_breakdown")
            if isinstance(breakdown, (dict, list)):
                breakdown = json.dumps(breakdown, ensure_ascii=False)
            
            # Преобразуем list/dict recommendations в JSON-строку
            recommendations = evaluation_data.get("manager_recommendations")
            if isinstance(recommendations, (dict, list)):
                recommendations = json.dumps(recommendations, ensure_ascii=False)
            
            cursor = conn.execute("""
                INSERT INTO call_evaluations (
                    call_id, is_quality_analyzable, not_analyzable_reason,
                    value_score, value_explanation,
                    manager_score, manager_feedback, manager_breakdown, manager_recommendations,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(call_id) DO UPDATE SET
                    is_quality_analyzable=excluded.is_quality_analyzable,
                    not_analyzable_reason=excluded.not_analyzable_reason,
                    value_score=excluded.value_score,
                    value_explanation=excluded.value_explanation,
                    manager_score=excluded.manager_score,
                    manager_feedback=excluded.manager_feedback,
                    manager_breakdown=excluded.manager_breakdown,
                    manager_recommendations=excluded.manager_recommendations,
                    created_at=excluded.created_at
            """, (
                evaluation_data["call_id"],
                1 if evaluation_data.get("is_quality_analyzable", True) else 0,
                evaluation_data.get("not_analyzable_reason"),
                evaluation_data.get("value_score"),
                evaluation_data.get("value_explanation"),
                evaluation_data.get("manager_score"),
                evaluation_data.get("manager_feedback"),
                breakdown,
                recommendations,
                datetime.now().isoformat()
            ))
            conn.commit()
            return cursor.lastrowid

    def get_evaluation(self, call_id: int) -> Optional[Dict[str, Any]]:
        """Получает оценку для звонка."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM call_evaluations WHERE call_id = ?", (call_id,))
            row = cursor.fetchone()
            if row:
                d = self._row_to_dict(row)
                # Убеждаемся, что is_quality_analyzable всегда булевое значение или None
                if d.get("is_quality_analyzable") is not None:
                    d["is_quality_analyzable"] = bool(d["is_quality_analyzable"])
                if d.get("manager_breakdown"):
                    try:
                        d["manager_breakdown"] = json.loads(d["manager_breakdown"])
                    except (json.JSONDecodeError, TypeError):
                        d["manager_breakdown"] = None
                if d.get("manager_recommendations"):
                    try:
                        d["manager_recommendations"] = json.loads(d["manager_recommendations"])
                    except (json.JSONDecodeError, TypeError):
                        d["manager_recommendations"] = None
                return d
            return None

    def get_call_history(self, number: str, limit: int = 5, exclude_call_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Получает историю звонков с абонентом (последние транскрибированные звонки)."""
        if not number:
            return []
            
        with self._get_connection() as conn:
            # Выбираем только звонки, у которых есть транскрипция (text IS NOT NULL)
            # В таблице calls нет поля manager_name (оно добавляется динамически в роутере),
            # поэтому берем internal_number и name
            sql = """
                SELECT t.text, c.timestamp, c.direction, c.name, c.internal_number
                FROM calls c
                JOIN transcripts t ON c.id = t.call_id
                WHERE c.number = ? AND t.text IS NOT NULL AND t.text != ''
            """
            params = [number]

            if exclude_call_id:
                sql += " AND c.id != ?"
                params.append(exclude_call_id)
            
            sql += " ORDER BY c.timestamp DESC LIMIT ?"
            params.append(limit)

            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            
            history = []
            for row in rows:
                # row structure: 0=text, 1=timestamp, 2=direction, 3=name, 4=internal_number
                ts = row[1]
                # Parse timestamp if string
                if isinstance(ts, str):
                    try:
                        dt = datetime.fromisoformat(ts)
                        date_str = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        date_str = ts
                else:
                     date_str = str(ts)

                # Resolve manager name
                internal_number = row[4]
                manager_name = None
                if internal_number:
                    manager_name = self.get_operator_name_by_internal_number(internal_number)
                
                if not manager_name:
                    manager_name = row[3] or "Менеджер" # Name or unknown

                d = {
                    "text": row[0],
                    "date": date_str,
                    "direction": row[2] or "Unknown",
                    "manager": manager_name,
                }
                history.append(d)
                
            return history

    def search_transcripts(self, query: str, internal_numbers: Optional[List[str]] = None, mobile_numbers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Поиск по транскриптам."""
        with self._get_connection() as conn:
            # Используем LIKE для простого поиска. 
            # Для более сложного можно использовать FTS5 (если скомпилирован с ним)
            sql = """
                SELECT t.*, c.filename, c.timestamp, c.number, c.name, c.internal_number, c.direction as call_direction
                FROM transcripts t
                JOIN calls c ON t.call_id = c.id
                WHERE (t.text LIKE ? OR t.title LIKE ? OR t.summary LIKE ? OR t.caller_name LIKE ? OR t.call_type LIKE ? OR t.call_topic LIKE ?)
            """
            params = []
            like_query = f"%{query}%"
            params.extend([like_query, like_query, like_query, like_query, like_query, like_query])
            
            # Фильтрация по внутренним номерам (Mango) и/или мобильным (Megafon)
            if internal_numbers or mobile_numbers:
                parts = []
                if internal_numbers:
                    ph = ','.join(['?'] * len(internal_numbers))
                    parts.append(f"c.internal_number IN ({ph})")
                    params.extend(internal_numbers)
                if mobile_numbers:
                    ph = ','.join(['?'] * len(mobile_numbers))
                    parts.append(f"c.number IN ({ph})")
                    params.extend(mobile_numbers)
                sql += " AND (" + " OR ".join(parts) + ")"
            
            sql += " ORDER BY c.timestamp DESC"
            
            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                if d.get("call_direction"):
                    d["direction"] = d["call_direction"]
                result.append(d)
            return result

    def get_calls(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Возвращает список звонков с пагинацией."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM calls ORDER BY timestamp DESC LIMIT ? OFFSET ?", 
                (limit, offset)
            )
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                result.append(d)
            return result

    def get_calls_in_range(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Возвращает список звонков за указанный период."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM calls 
                WHERE timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp DESC
            """, (start_date.isoformat(), end_date.isoformat()))
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                d["timestamp"] = self._parse_timestamp(d["timestamp"])
                result.append(d)
            return result


    def add_activity_log(self, level: str, message: str, actor: str) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO activity_log (timestamp, level, message, actor)
                VALUES (?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                level,
                message,
                actor
            ))
            # Очистка старых логов
            conn.execute("""
                DELETE FROM activity_log WHERE id NOT IN (
                    SELECT id FROM activity_log ORDER BY timestamp DESC LIMIT 100
                )
            """)
            conn.commit()

    def count_calls(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        internal_numbers: Optional[List[str]] = None,
        mobile_numbers: Optional[List[str]] = None,
        direction: Optional[str] = None,
        value_scores: Optional[List[int]] = None,
        operators: Optional[List[str]] = None,
    ) -> int:
        """Подсчитывает количество звонков с учетом фильтров по дате и внутренним/мобильным номерам."""
        with self._get_connection() as conn:
            sql = "SELECT COUNT(*) FROM calls c"
            
            # Добавляем JOIN с evaluations если нужна фильтрация по ценности
            if value_scores:
                sql += " INNER JOIN call_evaluations ce ON c.id = ce.call_id"
            
            sql += " WHERE 1=1"
            params = []
            
            if date_from:
                sql += " AND c.timestamp >= ?"
                params.append(date_from)
            
            if date_to:
                sql += " AND c.timestamp <= ?"
                params.append(date_to)
            
            # Фильтрация по внутренним номерам (Mango) и/или мобильным (Megafon)
            if internal_numbers or mobile_numbers:
                parts = []
                if internal_numbers:
                    ph = ','.join(['?'] * len(internal_numbers))
                    parts.append(f"c.internal_number IN ({ph})")
                    params.extend(internal_numbers)
                if mobile_numbers:
                    ph = ','.join(['?'] * len(mobile_numbers))
                    parts.append(f"c.number IN ({ph})")
                    params.extend(mobile_numbers)
                sql += " AND (" + " OR ".join(parts) + ")"
            
            if direction:
                sql += " AND c.direction = ?"
                params.append(direction)
            
            # Фильтрация по оператору
            if operators:
                placeholders = ','.join(['?'] * len(operators))
                sql += f" AND c.source IN ({placeholders})"
                params.extend(operators)
            
            # Фильтрация по ценности
            if value_scores:
                placeholders = ','.join(['?'] * len(value_scores))
                sql += f" AND ce.value_score IN ({placeholders})"
                params.extend(value_scores)
            
            cursor = conn.execute(sql, params)
            return cursor.fetchone()[0]

    def get_evaluations_stats(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        internal_numbers: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Возвращает статистику по оценкам, сгруппированную по менеджерам."""
        with self._get_connection() as conn:
            
            sql = """
                SELECT 
                    c.internal_number,
                    c.name as manager_name,
                    c.direction,
                    count(*) as total_calls,
                    sum(c.duration) as total_duration,
                    avg(ce.value_score) as avg_value_score,
                    avg(ce.manager_score) as avg_manager_score
                FROM calls c
                LEFT JOIN call_evaluations ce ON c.id = ce.call_id
                WHERE 1=1
            """
            params = []
            
            if date_from:
                sql += " AND c.timestamp >= ?"
                params.append(date_from)
            if date_to:
                sql += " AND c.timestamp <= ?"
                params.append(date_to)
            if internal_numbers:
                placeholders = ','.join(['?'] * len(internal_numbers))
                sql += f" AND c.internal_number IN ({placeholders})"
                params.extend(internal_numbers)
                
            sql += " GROUP BY c.internal_number, c.name, c.direction"
            
            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            
            stats = {}
            
            for row in rows:
                manager_key = row["manager_name"] or row["internal_number"] or "Unknown"
                if manager_key not in stats:
                    stats[manager_key] = {
                        "name": manager_key,
                        "internal_number": row["internal_number"],
                        "incoming": {"count": 0, "duration": 0},
                        "outgoing": {"count": 0, "duration": 0},
                        "total_input_tokens": 0 
                    }
                
                direction = row["direction"].lower() if row["direction"] else "unknown"
                if direction in ["incoming", "входящий"]:
                     tgt = stats[manager_key]["incoming"]
                else:
                     tgt = stats[manager_key]["outgoing"]
                     
                tgt["count"] += row["total_calls"]
                tgt["duration"] += row["total_duration"] or 0
                
            
            sql_dist = """
                SELECT 
                    c.name as manager_name,
                    c.internal_number,
                    ce.value_score,
                    count(*) as count,
                    sum(c.duration) as duration
                FROM calls c
                JOIN call_evaluations ce ON c.id = ce.call_id
                WHERE ce.value_score IS NOT NULL
            """
            params_dist = []
            if date_from:
                sql_dist += " AND c.timestamp >= ?"
                params_dist.append(date_from)
            if date_to:
                sql_dist += " AND c.timestamp <= ?"
                params_dist.append(date_to)
            if internal_numbers:
                placeholders = ','.join(['?'] * len(internal_numbers))
                sql_dist += f" AND c.internal_number IN ({placeholders})"
                params_dist.extend(internal_numbers)
            
            sql_dist += " GROUP BY c.name, c.internal_number, ce.value_score"
            
            cursor = conn.execute(sql_dist, params_dist)
            rows = cursor.fetchall()
            
            for row in rows:
                manager_key = row["manager_name"] or row["internal_number"] or "Unknown"
                if manager_key not in stats:
                     continue 
                
                if "score_distribution" not in stats[manager_key]:
                    stats[manager_key]["score_distribution"] = {}
                
                score = row["value_score"]
                stats[manager_key]["score_distribution"][score] = {
                    "count": row["count"],
                    "duration": row["duration"]
                }

            return stats

    def calculate_metrics(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            total_calls = conn.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
            transcribed = conn.execute("SELECT COUNT(*) FROM transcripts").fetchone()[0]
            
            row = conn.execute("SELECT AVG(duration) FROM calls WHERE duration > 0").fetchone()
            avg_duration = int(row[0]) if row and row[0] is not None else 0
            
            row = conn.execute("SELECT MAX(timestamp) FROM activity_log").fetchone()
            last_sync = None
            if row and row[0]:
                last_sync = self._parse_timestamp(row[0])
                
            return {
                "total_calls": total_calls,
                "transcribed": transcribed,
                "avg_duration": avg_duration,
                "last_sync": last_sync,
            }

    # Методы для работы с пользователями
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Получает пользователя по имени пользователя."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
            row = cursor.fetchone()
            if row:
                d = self._row_to_dict(row)
                # Если first_name или last_name пустые, пытаемся извлечь из name
                if not d.get("first_name") and d.get("name"):
                    parts = d["name"].split(maxsplit=1)
                    d["first_name"] = parts[0] if parts else ""
                    d["last_name"] = parts[1] if len(parts) > 1 else ""
                return d
            return None

    def verify_password(self, username: str, password: str) -> bool:
        """Проверяет пароль пользователя."""
        user = self.get_user_by_username(username)
        if not user:
            return False
        return check_password_hash(user["password_hash"], password)

    def create_user(self, username: str, password: str, first_name: str, last_name: str = "", internal_numbers: Optional[str] = None, mobile_numbers: Optional[str] = None, telegram_chat_id: Optional[str] = None, telegram_daily_report: bool = False, telegram_manager_report: bool = False) -> int:
        """Создает нового пользователя."""
        internal_numbers = normalize_numbers_csv(internal_numbers, is_mobile=False)
        mobile_numbers = normalize_numbers_csv(mobile_numbers, is_mobile=True)
        with self._get_connection() as conn:
            password_hash = generate_password_hash(password)
            created_at = datetime.now().isoformat()
            # Сохраняем полное имя для обратной совместимости
            full_name = f"{first_name} {last_name}".strip() if last_name else first_name
            cursor = conn.execute("""
                INSERT INTO users (username, password_hash, name, first_name, last_name, created_at, is_active, internal_numbers, mobile_numbers, telegram_chat_id, telegram_daily_report, telegram_manager_report)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
            """, (username, password_hash, full_name, first_name, last_name, created_at, internal_numbers, mobile_numbers, telegram_chat_id, telegram_daily_report, telegram_manager_report))
            conn.commit()
            return cursor.lastrowid

    def save_telegram_connect_token(self, user_id: int, token: str) -> bool:
        """Сохраняет токен подключения Telegram для пользователя."""
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "UPDATE users SET telegram_connect_token = ? WHERE id = ?",
                    (token, user_id)
                )
                conn.commit()
            return True
        except Exception as e:
            print(f"Error saving telegram token: {e}")
            return False

    def confirm_telegram_connect(self, token: str, chat_id: str) -> bool:
        """
        Проверяет токен и привязывает chat_id к пользователю.
        Возвращает True, если успешно.
        """
        token_mask = f"{token[:4]}...{token[-2:]}" if len(token) > 6 else "***"
        logger.info("Telegram connect: bot передал chat_id=%s, token=%s", chat_id, token_mask)
        try:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT id FROM users WHERE telegram_connect_token = ?",
                    (token,)
                )
                row = cursor.fetchone()
                if not row:
                    logger.warning("Telegram connect: токен не найден или устарел, token=%s", token_mask)
                    return False
                
                user_id = row[0]
                conn.execute(
                    "UPDATE users SET telegram_chat_id = ?, telegram_connect_token = NULL WHERE id = ?",
                    (chat_id, user_id)
                )
                conn.commit()
                logger.info("Telegram connect: user_id=%s привязан к chat_id=%s", user_id, chat_id)
                return True
        except Exception as e:
            logger.error("Telegram connect: ошибка confirm_telegram_connect: %s", e, exc_info=True)
            return False

    def disconnect_telegram(self, user_id: int) -> bool:
        """Отвязывает Telegram от пользователя."""
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "UPDATE users SET telegram_chat_id = NULL, telegram_daily_report = 0, telegram_manager_report = 0 WHERE id = ?",
                    (user_id,)
                )
                conn.commit()
            return True
        except Exception as e:
            print(f"Error disconnecting telegram: {e}")
            return False

    def save_max_connect_token(self, user_id: int, token: str) -> bool:
        """Сохраняет токен подключения MAX для пользователя."""
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "UPDATE users SET max_connect_token = ? WHERE id = ?",
                    (token, user_id)
                )
                conn.commit()
            return True
        except Exception as e:
            print(f"Error saving MAX token: {e}")
            return False

    def confirm_max_connect(self, token: str, chat_id: str) -> bool:
        """
        Проверяет токен и привязывает max_chat_id к пользователю.
        Возвращает True, если успешно.
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT id FROM users WHERE max_connect_token = ?",
                    (token,)
                )
                row = cursor.fetchone()
                if not row:
                    return False
                
                user_id = row[0]
                # Привязываем chat_id и очищаем токен
                conn.execute(
                    "UPDATE users SET max_chat_id = ?, max_connect_token = NULL WHERE id = ?",
                    (chat_id, user_id)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error confirming MAX connect: {e}")
            return False

    def disconnect_max(self, user_id: int) -> bool:
        """Отвязывает MAX от пользователя."""
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "UPDATE users SET max_chat_id = NULL, max_daily_report = 0, max_manager_report = 0 WHERE id = ?",
                    (user_id,)
                )
                conn.commit()
            return True
        except Exception as e:
            print(f"Error disconnecting MAX: {e}")
            return False

    def update_user_password(self, user_id: int, new_password: str) -> bool:
        """Обновляет пароль пользователя."""
        with self._get_connection() as conn:
            password_hash = generate_password_hash(new_password)
            cursor = conn.execute("""
                UPDATE users SET password_hash = ? WHERE id = ? AND is_active = 1
            """, (password_hash, user_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def update_user_internal_numbers(self, user_id: int, internal_numbers: Optional[str]) -> bool:
        """Обновляет внутренние номера пользователя."""
        internal_numbers = normalize_numbers_csv(internal_numbers, is_mobile=False)
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users SET internal_numbers = ? WHERE id = ? AND is_active = 1
            """, (internal_numbers, user_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def update_user_mobile_numbers(self, user_id: int, mobile_numbers: Optional[str]) -> bool:
        """Обновляет мобильные номера пользователя (для Мегафон)."""
        mobile_numbers = normalize_numbers_csv(mobile_numbers, is_mobile=True)
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users SET mobile_numbers = ? WHERE id = ? AND is_active = 1
            """, (mobile_numbers, user_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def update_user_name(self, user_id: int, first_name: str, last_name: str = "") -> bool:
        """Обновляет имя и фамилию пользователя."""
        with self._get_connection() as conn:
            # Обновляем полное имя для обратной совместимости
            full_name = f"{first_name} {last_name}".strip() if last_name else first_name
            cursor = conn.execute("""
                UPDATE users SET first_name = ?, last_name = ?, name = ? WHERE id = ? AND is_active = 1
            """, (first_name, last_name, full_name, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_user_telegram_settings(self, user_id: int, telegram_chat_id: Optional[str], telegram_daily_report: bool, telegram_manager_report: bool) -> bool:
        """Обновляет настройки Telegram для пользователя."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users 
                SET telegram_chat_id = ?, telegram_daily_report = ?, telegram_manager_report = ?
                WHERE id = ? AND is_active = 1
            """, (telegram_chat_id, telegram_daily_report, telegram_manager_report, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_user_filters(self, user_id: int, exclude_answering_machine: bool, min_duration: int, min_replicas: int) -> bool:
        """Обновляет настройки фильтрации отчетов."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users 
                SET filter_exclude_answering_machine = ?, 
                    filter_min_duration = ?, 
                    filter_min_replicas = ?
                WHERE id = ? AND is_active = 1
            """, (exclude_answering_machine, min_duration, min_replicas, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_user_report_kpi_settings(self, user_id: int, user_data: Any) -> bool:
        """Обновляет настройки отчетов и KPI (email, периодичность отчетов, KPI)."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users 
                SET email = ?,
                    telegram_weekly_report = ?,
                    telegram_monthly_report = ?,
                    email_daily_report = ?,
                    email_weekly_report = ?,
                    email_monthly_report = ?,
                    report_include_call_summaries = ?,
                    report_detailed = ?,
                    report_include_avg_value = ?,
                    report_include_avg_rating = ?,
                    kpi_base_salary = ?,
                    kpi_target_bonus = ?,
                    kpi_target_talk_time_minutes = ?,
                    telegram_skip_weekends = ?,
                    report_managed_user_ids = ?
                WHERE id = ? AND is_active = 1
            """, (
                user_data.email,
                user_data.telegram_weekly_report,
                user_data.telegram_monthly_report,
                user_data.email_daily_report,
                user_data.email_weekly_report,
                user_data.email_monthly_report,
                user_data.report_include_call_summaries,
                user_data.report_detailed,
                user_data.report_include_avg_value,
                user_data.report_include_avg_rating,
                user_data.kpi_base_salary,
                user_data.kpi_target_bonus,
                user_data.kpi_target_talk_time_minutes,
                getattr(user_data, 'telegram_skip_weekends', False) or False,
                json.dumps(ids) if (ids := getattr(user_data, 'report_managed_user_ids', None)) is not None else None,
                user_id
            ))
            conn.commit()
            return cursor.rowcount > 0

    def get_users_for_reports(self) -> List[Dict[str, Any]]:
        """Возвращает список пользователей для рассылки отчетов."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT id, username, first_name, last_name, 
                           telegram_chat_id, telegram_daily_report, telegram_manager_report,
                           telegram_weekly_report, telegram_monthly_report,
                           email, email_daily_report, email_weekly_report, email_monthly_report,
                           report_include_call_summaries, report_detailed,
                           report_include_avg_value, report_include_avg_rating,
                           max_chat_id, max_daily_report, max_manager_report,
                           filter_exclude_answering_machine, filter_min_duration, filter_min_replicas,
                           telegram_skip_weekends, report_managed_user_ids
                    FROM users 
                    WHERE (telegram_daily_report = 1 AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '')
                       OR (telegram_manager_report = 1 AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '')
                       OR (telegram_weekly_report = 1 AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '')
                       OR (telegram_monthly_report = 1 AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '')
                       OR (max_daily_report = 1 AND max_chat_id IS NOT NULL AND max_chat_id != '')
                       OR (max_manager_report = 1 AND max_chat_id IS NOT NULL AND max_chat_id != '')
                       OR (email_daily_report = 1 AND email IS NOT NULL AND email != '')
                       OR (email_weekly_report = 1 AND email IS NOT NULL AND email != '')
                       OR (email_monthly_report = 1 AND email IS NOT NULL AND email != '')
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error getting users for report: {e}")
            return []
    
    def get_operator_name_by_internal_number(self, internal_number: Optional[str]) -> Optional[str]:
        """
        Возвращает имя пользователя, которому назначен указанный внутренний или мобильный номер.
        Если точного соответствия нет, пытается вернуть пользователя с правами на все номера.
        Поддерживает поиск как по internal_numbers (для Mango), так и по mobile_numbers (для Megafon).
        """
        if not internal_number:
            return None
        
        normalized = str(internal_number).strip()
        if not normalized:
            return None
        
        # Нормализуем номер для сравнения с мобильными (убираем +7, заменяем 8 на 7)
        normalized_mobile = normalized
        if normalized.startswith('+'):
            normalized_mobile = normalized[1:]
        if normalized_mobile.startswith('8') and len(normalized_mobile) == 11:
            normalized_mobile = '7' + normalized_mobile[1:]
        
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT first_name, last_name, name, internal_numbers, mobile_numbers
                FROM users
                WHERE is_active = 1
            """)
            for row in cursor.fetchall():
                internal_numbers_raw = (row["internal_numbers"] or "").strip()
                mobile_numbers_raw = (row["mobile_numbers"] or "").strip()
                
                if not internal_numbers_raw and not mobile_numbers_raw:
                    continue
                    
                # Используем только first_name (имя без фамилии), если есть, иначе используем name
                user_name = None
                try:
                    first_name = row["first_name"]
                    if first_name and first_name.strip():
                        user_name = first_name.strip()  # Только имя, без фамилии
                    else:
                        # Если first_name нет, используем name (может быть полное имя, берем первое слово)
                        full_name = row["name"]
                        if full_name and full_name.strip():
                            name_parts = full_name.strip().split()
                            user_name = name_parts[0] if name_parts else full_name.strip()
                except (KeyError, TypeError):
                    # Если поля нет или значение None, пропускаем
                    continue
                
                # Проверяем internal_numbers (для звонков Mango и extension МегаФона)
                if internal_numbers_raw:
                    if internal_numbers_raw.lower() != "all":
                        numbers = [num.strip() for num in internal_numbers_raw.split(",") if num.strip()]
                        if normalized in numbers:
                            return user_name
                
                # Проверяем mobile_numbers (для звонков Megafon)
                if mobile_numbers_raw:
                    mobile_numbers = [num.strip() for num in mobile_numbers_raw.split(",") if num.strip()]
                    for mobile in mobile_numbers:
                        # Нормализуем мобильный номер из базы
                        mobile_norm = mobile
                        if mobile.startswith('+'):
                            mobile_norm = mobile[1:]
                        if mobile_norm.startswith('8') and len(mobile_norm) == 11:
                            mobile_norm = '7' + mobile_norm[1:]
                        
                        # Сравниваем нормализованные номера
                        if normalized_mobile == mobile_norm or normalized == mobile:
                            return user_name
                            
            return None  # Не возвращаем fallback — при отсутствии совпадения сотрудник не определён

    
    def get_calls_statistics_by_internal_number(self, date_from: Optional[str] = None, date_to: Optional[str] = None, internal_numbers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Получает агрегированную статистику по звонкам (для таблицы статистики)."""
        with self._get_connection() as conn:
            sql = """
                SELECT 
                    c.internal_number,
                    GROUP_CONCAT(DISTINCT u.name) as manager_names
                    ,
                    SUM(CASE WHEN c.direction = 'Входящий' THEN 1 ELSE 0 END) as incoming_count,
                    SUM(CASE WHEN c.direction = 'Исходящий' THEN 1 ELSE 0 END) as outgoing_count,
                    SUM(CASE WHEN c.direction = 'Входящий' THEN c.duration ELSE 0 END) as incoming_duration,
                    SUM(CASE WHEN c.direction = 'Исходящий' THEN c.duration ELSE 0 END) as outgoing_duration
                FROM calls c
                LEFT JOIN users u ON (
                    u.is_active = 1 
                    AND u.internal_numbers IS NOT NULL 
                    AND u.internal_numbers != ''
                    AND (
                        u.internal_numbers = 'all'
                        OR (
                            ',' || u.internal_numbers || ',' LIKE '%,' || c.internal_number || ',%'
                            OR u.internal_numbers = c.internal_number
                            OR u.internal_numbers LIKE c.internal_number || ',%'
                            OR u.internal_numbers LIKE '%,' || c.internal_number
                        )
                    )
                )
                WHERE c.internal_number IS NOT NULL AND c.internal_number != ''
            """
            params = []
            
            if date_from:
                sql += " AND c.timestamp >= ?"
                params.append(date_from)
            
            if date_to:
                sql += " AND c.timestamp <= ?"
                params.append(date_to)
            
            if internal_numbers:
                placeholders = ','.join(['?'] * len(internal_numbers))
                sql += f" AND c.internal_number IN ({placeholders})"
                params.extend(internal_numbers)
            
            sql += " GROUP BY c.internal_number ORDER BY c.internal_number"
            
            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                managers = [name.strip() for name in (d.get("manager_names") or "").split(",") if name and name.strip()]
                result.append({
                    "internal_number": d["internal_number"],
                    "managers": managers,
                    "incoming_count": d.get("incoming_count") or 0,
                    "outgoing_count": d.get("outgoing_count") or 0,
                    "incoming_duration": int(d.get("incoming_duration") or 0),
                    "outgoing_duration": int(d.get("outgoing_duration") or 0),
                })
            
            return result

    def delete_user(self, user_id: int) -> bool:
        """Удаляет пользователя (деактивирует)."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE users SET is_active = 0 WHERE id = ?
            """, (user_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Получает список всех активных пользователей."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, username, name, first_name, last_name, created_at, is_active, internal_numbers, mobile_numbers,
                       telegram_chat_id, telegram_daily_report, telegram_manager_report,
                       max_chat_id, max_daily_report, max_manager_report,
                       filter_exclude_answering_machine, filter_min_duration, filter_min_replicas,
                       email, email_daily_report, email_weekly_report, email_monthly_report,
                       telegram_weekly_report, telegram_monthly_report,
                       report_include_call_summaries, report_detailed,
                       report_include_avg_value, report_include_avg_rating,
                       kpi_base_salary, kpi_target_bonus, kpi_target_talk_time_minutes
                FROM users 
                WHERE is_active = 1 
                ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                created_at = self._parse_timestamp(d["created_at"])
                # Ensure created_at is an ISO-formatted string
                if isinstance(created_at, datetime):
                    d["created_at"] = created_at.isoformat()
                else:
                    d["created_at"] = created_at
                # Если first_name или last_name пустые, пытаемся извлечь из name
                if not d.get("first_name") and d.get("name"):
                    parts = d["name"].split(maxsplit=1)
                    d["first_name"] = parts[0] if parts else ""
                    d["last_name"] = parts[1] if len(parts) > 1 else ""
                result.append(d)
            return result

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получает пользователя по ID."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,))
            row = cursor.fetchone()
            if row:
                d = self._row_to_dict(row)
                created_at = self._parse_timestamp(d["created_at"])
                # Ensure created_at is an ISO-formatted string
                if isinstance(created_at, datetime):
                    d["created_at"] = created_at.isoformat()
                else:
                    d["created_at"] = created_at
                # Если first_name или last_name пустые, пытаемся извлечь из name
                if not d.get("first_name") and d.get("name"):
                    parts = d["name"].split(maxsplit=1)
                    d["first_name"] = parts[0] if parts else ""
                    d["last_name"] = parts[1] if len(parts) > 1 else ""
                return d
            return None
    
    # Методы для работы с промптами
    def get_prompt(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Получает промпт по ключу."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT value FROM prompts WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                value = row[0]
                # Убеждаемся, что значение правильно декодировано
                if isinstance(value, bytes):
                    value = value.decode('utf-8', errors='replace')
                return value
            return default
    
    def get_all_prompts(self) -> List[Dict[str, Any]]:
        """Получает все промпты."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT key, value, description, updated_at 
                FROM prompts 
                ORDER BY key
            """)
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = self._row_to_dict(row)
                # Убеждаемся, что строковые значения правильно декодированы
                if d.get("value") and isinstance(d["value"], bytes):
                    d["value"] = d["value"].decode('utf-8', errors='replace')
                if d.get("description") and isinstance(d["description"], bytes):
                    d["description"] = d["description"].decode('utf-8', errors='replace')
                # Преобразуем updated_at в строку ISO формата
                updated_at = d.get("updated_at")
                if updated_at:
                    if isinstance(updated_at, datetime):
                        d["updated_at"] = updated_at.isoformat()
                    elif isinstance(updated_at, str):
                        d["updated_at"] = updated_at
                    else:
                        d["updated_at"] = self._parse_timestamp(updated_at)
                        if isinstance(d["updated_at"], datetime):
                            d["updated_at"] = d["updated_at"].isoformat()
                else:
                    d["updated_at"] = None
                result.append(d)
            return result
    
    def update_prompt(self, key: str, value: str, description: Optional[str] = None) -> bool:
        """Обновляет промпт."""
        with self._get_connection() as conn:
            if description:
                cursor = conn.execute("""
                    UPDATE prompts 
                    SET value = ?, description = ?, updated_at = ? 
                    WHERE key = ?
                """, (value, description, datetime.now().isoformat(), key))
            else:
                cursor = conn.execute("""
                    UPDATE prompts 
                    SET value = ?, updated_at = ? 
                    WHERE key = ?
                """, (value, datetime.now().isoformat(), key))
            conn.commit()
            return cursor.rowcount > 0
