"""Клиент для работы с Gemini API."""

from __future__ import annotations

import json
import os
import re
import base64
import requests
from pathlib import Path
from typing import Any, Dict, Optional

import google.generativeai as genai
from google.generativeai import GenerativeModel

from app.core import config as app_config


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


def _resolve_operator_name(internal_number: Optional[str]) -> Optional[str]:
    """Возвращает имя оператора по внутреннему номеру."""
    if not internal_number:
        return None
    try:
        from .storage import SQLiteStorage
        storage = SQLiteStorage()
        return storage.get_operator_name_by_internal_number(internal_number)
    except Exception as e:
        print(f"Ошибка получения имени оператора для {internal_number}: {e}")
        return None

# Настройка прокси если включено
if app_config.settings.PROXY_ENABLED:
    os.environ['http_proxy'] = app_config.settings.HTTP_PROXY
    os.environ['https_proxy'] = app_config.settings.HTTPS_PROXY

# Инициализация Gemini с поддержкой нескольких ключей
_current_api_key_index = 0
_exhausted_keys = set()  # Множество индексов ключей с исчерпанным дневным лимитом
_use_artemox = False  # Флаг использования artemox.com как резервного API

def _get_gemini_api_keys():
    """Get list of Gemini API keys."""
    keys = []
    if app_config.settings.GEMINI_API_KEY:
        keys.append(app_config.settings.GEMINI_API_KEY)
    if app_config.settings.GEMINI_API_KEY_2:
        keys.append(app_config.settings.GEMINI_API_KEY_2)
    return keys

def _get_current_api_key() -> Optional[str]:
    """Возвращает текущий активный ключ API."""
    keys = _get_gemini_api_keys()
    if keys:
        return keys[_current_api_key_index % len(keys)]
    return app_config.settings.GEMINI_API_KEY or None

def _switch_to_next_api_key():
    """Переключается на следующий доступный ключ API, пропуская исчерпанные."""
    global _current_api_key_index
    keys = _get_gemini_api_keys()
    if len(keys) <= 1:
        return False
    
    # Пробуем найти доступный ключ
    original_index = _current_api_key_index
    attempts = 0
    
    while attempts < len(keys):
        _current_api_key_index = (_current_api_key_index + 1) % len(keys)
        attempts += 1
        
        # Если этот ключ не исчерпан - используем его
        if _current_api_key_index not in _exhausted_keys:
            new_key = _get_current_api_key()
            genai.configure(api_key=new_key)
            keys = _get_gemini_api_keys()
            print(f"--- [GEMINI] Переключено на ключ #{_current_api_key_index + 1} из {len(keys)} ---")
            return True
    
    # Все ключи исчерпаны
    _current_api_key_index = original_index
    print(f"--- [GEMINI] Все ключи исчерпаны. Исчерпанные ключи: {sorted(_exhausted_keys)} ---")
    return False

def _mark_key_as_exhausted(key_index: int):
    """Помечает ключ как исчерпанный."""
    global _exhausted_keys
    _exhausted_keys.add(key_index)
    print(f"--- [GEMINI] Ключ #{key_index + 1} помечен как исчерпанный ---")

def _switch_to_artemox():
    """Переключается на artemox.com API как резервный."""
    global _use_artemox
    if app_config.settings.ARTEMOX_API_KEY:
        _use_artemox = True
        print(f"--- [ARTEMOX] Переключение на резервный API artemox.com ---")
        return True
    return False

def _make_artemox_request(audio_path: Optional[Path] = None, text_prompt: Optional[str] = None, 
                          system_instruction: Optional[str] = None, model: str = "gemini-2.5-pro",
                          max_retries: int = 3) -> Optional[str]:
    """
    Выполняет запрос к artemox.com API с повторными попытками.
    Поддерживает как текстовые запросы, так и транскрибацию аудио.
    Поскольку у artemox.com нет лимитов на количество запросов в минуту,
    при неудачной попытке делаем еще 2 попытки (всего 3 попытки).
    """
    if not app_config.settings.ARTEMOX_API_KEY:
        return None
    
    # Повторные попытки (всего max_retries попыток)
    for attempt in range(max_retries):
        try:
            url = f"{app_config.settings.ARTEMOX_API_BASE}/chat/completions"
            headers = {
                "Authorization": f"Bearer {app_config.settings.ARTEMOX_API_KEY}",
                "Content-Type": "application/json"
            }
            
            messages = []
            
            # Добавляем системное сообщение если есть
            if system_instruction:
                messages.append({
                    "role": "system",
                    "content": system_instruction
                })
            
            # Формируем контент запроса
            if audio_path and audio_path.exists():
                # Для аудио: конвертируем в base64 и отправляем как часть сообщения
                # Artemox.com использует OpenAI-совместимый API
                audio_bytes = audio_path.read_bytes()
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                # Формируем сообщение с аудио в формате OpenAI (data URL)
                content_parts = []
                if text_prompt:
                    content_parts.append({
                        "type": "text",
                        "text": text_prompt
                    })
                # Используем формат data URL для аудио (как в OpenAI API)
                content_parts.append({
                    "type": "image_url",  # В OpenAI-совместимых API для base64 используется image_url
                    "image_url": {
                        "url": f"data:audio/mp3;base64,{audio_base64}"
                    }
                })
                
                messages.append({
                    "role": "user",
                    "content": content_parts
                })
            else:
                # Текстовый запрос
                messages.append({
                    "role": "user",
                    "content": text_prompt or ""
                })
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.1
            }
            
            # Отправляем запрос БЕЗ прокси (как указано в требованиях)
            # Временно отключаем прокси для этого запроса
            old_proxies = os.environ.get('http_proxy'), os.environ.get('https_proxy')
            if config.PROXY_CONFIG['ENABLED']:
                os.environ.pop('http_proxy', None)
                os.environ.pop('https_proxy', None)
            
            try:
                if attempt > 0:
                    print(f"--- [ARTEMOX] Попытка {attempt + 1}/{max_retries} ---")
                
                response = requests.post(url, json=payload, headers=headers, timeout=300)
                response.raise_for_status()
                result = response.json()
                
                # Восстанавливаем прокси если были
                if old_proxies[0]:
                    os.environ['http_proxy'] = old_proxies[0]
                if old_proxies[1]:
                    os.environ['https_proxy'] = old_proxies[1]
                
                # Извлекаем текст из ответа
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0].get('message', {}).get('content', '')
                    if content:
                        return content
                    else:
                        print(f"--- [ARTEMOX] Пустой ответ от API (попытка {attempt + 1}/{max_retries}) ---")
                else:
                    print(f"--- [ARTEMOX] Нет choices в ответе (попытка {attempt + 1}/{max_retries}) ---")
                
                # Если дошли сюда, значит ответ пустой или некорректный
                if attempt < max_retries - 1:
                    time.sleep(2)  # Небольшая задержка перед следующей попыткой
                    continue
                return None
                
            except requests.exceptions.RequestException as e:
                # Восстанавливаем прокси при ошибке
                if old_proxies[0]:
                    os.environ['http_proxy'] = old_proxies[0]
                if old_proxies[1]:
                    os.environ['https_proxy'] = old_proxies[1]
                
                print(f"--- [ARTEMOX] Ошибка запроса (попытка {attempt + 1}/{max_retries}): {e} ---")
                
                # Если это последняя попытка, возвращаем None
                if attempt >= max_retries - 1:
                    return None
                
                # Небольшая задержка перед следующей попыткой
                time.sleep(2)
                continue
                
        except Exception as e:
            print(f"--- [ARTEMOX] Исключение при запросе (попытка {attempt + 1}/{max_retries}): {e} ---")
            
            # Если это последняя попытка, возвращаем None
            if attempt >= max_retries - 1:
                return None
            
            # Небольшая задержка перед следующей попыткой
            time.sleep(2)
            continue
    
    return None

# Инициализация с первым ключом
initial_key = _get_current_api_key()
if initial_key:
    genai.configure(api_key=initial_key)
    keys = _get_gemini_api_keys()
    if len(keys) > 1:
        print(f"--- [GEMINI] Инициализировано {len(keys)} ключей API ---")

import time
from google.api_core import exceptions

# Конфигурация моделей и лимитов
MODELS_CONFIG = {
    "gemini-2.5-pro": {
        "name": "Gemini 2.5 Pro", 
        "id": "gemini-2.5-pro",
        "rpm": 2,
        "rpd": 50
    },
    "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash", 
        "id": "gemini-2.5-flash",
        "rpm": 10,
        "rpd": 250
    },
    "gemini-2.5-flash-lite": {
        "name": "Gemini 2.5 Flash-Lite", 
        "id": "gemini-2.5-flash-lite",
        "rpm": 15,
        "rpd": 1000
    },
    # gemini-1.5-flash удалена - не поддерживается в API v1beta
    # Используйте gemini-2.5-flash вместо неё
    "gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro", 
        "id": "gemini-1.5-pro",
        "rpm": 2,
        "rpd": 50
    }
}

def get_model_config() -> Dict[str, Any]:
    """Возвращает конфигурацию выбранной модели."""
    try:
        # По умолчанию используем Flash (он быстрее и дешевле)
        default_key = "gemini-2.5-flash"
        model_key = get_prompt("gemini_model", default_key)
        
        if model_key in MODELS_CONFIG:
            return MODELS_CONFIG[model_key]
            
        # Fallback на поиск по ID
        for key, conf in MODELS_CONFIG.items():
            if conf["id"] == model_key:
                return conf
                
        return MODELS_CONFIG[default_key]
    except Exception:
        return MODELS_CONFIG["gemini-2.5-flash"]


def _make_gemini_request(model, content, config_rpm, max_retries=3, model_id=None, system_instruction=None, **kwargs):
    """Выполняет запрос к Gemini с повторными попытками при превышении лимитов и автоматическим переключением ключей."""
    attempt = 0
    key_switched = False
    
    # Сохраняем параметры модели для пересоздания
    if model_id is None:
        model_id = getattr(model, '_model_name', None) or getattr(model, 'model_name', None) or 'gemini-2.5-pro'
    if system_instruction is None:
        system_instruction = getattr(model, 'system_instruction', None)
    
    while attempt < max_retries:
        try:
            # Убираем system_instruction из kwargs, если он там есть (он используется только при создании модели)
            request_kwargs = {k: v for k, v in kwargs.items() if k != 'system_instruction'}
            if isinstance(content, list):
                return model.generate_content(content, **request_kwargs)
            else:
                return model.generate_content(content, **request_kwargs)
        except exceptions.ResourceExhausted as e:
            error_str = str(e).lower()
            
            # Проверяем, это дневной лимит (RPD) или минутный (RPM)
            is_daily_quota = 'quota' in error_str and ('day' in error_str or 'rpd' in error_str or 'free_tier_requests' in error_str)
            
            # Если это дневной лимит и есть другие ключи - переключаемся
            keys = _get_gemini_api_keys()
            if is_daily_quota and len(keys) > 1 and not key_switched:
                # Помечаем текущий ключ как исчерпанный
                _mark_key_as_exhausted(_current_api_key_index)
                
                print(f"--- [GEMINI] Достигнут дневной лимит на ключе #{_current_api_key_index + 1}. Поиск доступного ключа... ---")
                if _switch_to_next_api_key():
                    # Пересоздаем модель с новым ключом
                    if system_instruction:
                        model = GenerativeModel(model_id, system_instruction=system_instruction)
                    else:
                        model = GenerativeModel(model_id)
                    
                    key_switched = True
                    attempt = 0  # Сбрасываем счетчик попыток для нового ключа
                    continue
                else:
                    # Все ключи исчерпаны - пробуем artemox
                    if app_config.settings.ARTEMOX_API_KEY and not _use_artemox:
                        print(f"--- [GEMINI] Все ключи исчерпаны. Переключение на artemox.com... ---")
                        if _switch_to_artemox():
                            raise ArtemoxFallbackException(e)
                    print(f"--- [GEMINI] Все доступные ключи исчерпаны. Невозможно продолжить. ---")
                    raise
            
            attempt += 1
            if attempt >= max_retries:
                if is_daily_quota:
                    print(f"--- [GEMINI] Дневной лимит исчерпан. Все ключи использованы или попытки исчерпаны. ---")
                else:
                    print(f"--- [GEMINI] Превышен лимит запросов (RPM={config_rpm}). Попытки исчерпаны. ---")
                raise
            
            # Рассчитываем задержку: 60 сек / RPM + небольшой буфер
            delay = (60.0 / config_rpm) + 1.0
            print(f"--- [GEMINI] Превышен лимит запросов. Ожидание {delay:.1f} сек... (Попытка {attempt}/{max_retries}) ---")
            time.sleep(delay)
        except Exception as e:
            error_str = str(e).lower()
            
            # Если все ключи исчерпаны или произошла критическая ошибка - пробуем artemox
            keys = _get_gemini_api_keys()
            if (len(keys) == len(_exhausted_keys) or 
                'quota' in error_str or 
                'resource exhausted' in error_str or
                attempt >= max_retries - 1):
                
                if app_config.settings.ARTEMOX_API_KEY and not _use_artemox:
                    print(f"--- [GEMINI] Все ключи исчерпаны или критическая ошибка. Переключение на artemox.com... ---")
                    if _switch_to_artemox():
                        # Возвращаем специальный объект для переключения на artemox
                        raise ArtemoxFallbackException(e)
            
            print(f"--- [GEMINI] Ошибка API: {e} ---")
            if attempt >= max_retries - 1:
                raise e
            attempt += 1
            time.sleep(2)  # Небольшая задержка перед следующей попыткой

class ArtemoxFallbackException(Exception):
    """Исключение для переключения на artemox.com API."""
    def __init__(self, original_error):
        self.original_error = original_error
        super().__init__(f"Fallback to artemox: {original_error}")

def transcribe_audio(audio_path: Path, operator_internal_number: Optional[str] = None, direction: Optional[str] = None) -> Optional[str]:
    """
    Транскрибирует аудио файл через Gemini API или artemox.com (если переключились).
    """
    # Если уже переключились на artemox, используем его сразу
    if _use_artemox and app_config.settings.ARTEMOX_API_KEY:
        print(f"--- [ARTEMOX] Transcribe Audio: {audio_path.name} (используется artemox) ---")
        try:
            # Формируем системную инструкцию
            system_instruction = (
                "Ты профессиональный транскрибатор аудиозвонков. Твоя задача — максимально точно передать речь в текст, "
                "разделяя спикеров. Ты не должен фантазировать, додумывать или добавлять текст, которого нет в аудио.\n"
                "Структура ответа: только текст диалога, каждая реплика с новой строки."
            )
            
            operator_name = _resolve_operator_name(
                str(operator_internal_number).strip() if operator_internal_number else None
            )
            
            if operator_name and operator_internal_number:
                system_instruction += (
                    f"\n\nВАЖНО: В разговоре участвуют ДВА человека - оператор и клиент. "
                    f"Имя оператора: {operator_name}. "
                    f"Используй имя «{operator_name}» ТОЛЬКО для реплик оператора. "
                    f"Для реплик клиента: если клиент представился, используй его имя/название. "
                    f"Если клиент не представился, используй обозначение «Клиент»."
                )
            elif operator_internal_number:
                system_instruction += (
                    f"\n\nВАЖНО: В разговоре участвуют ДВА человека - оператор и клиент. "
                    f"Внутренний номер оператора: {operator_internal_number}. "
                    f"Для реплик оператора используй обозначение «Оператор». "
                    f"Для реплик клиента: если клиент представился, используй его имя/название. "
                    f"Если клиент не представился, используй обозначение «Клиент»."
                )
            else:
                system_instruction += (
                    "\n\nВАЖНО: В разговоре участвуют ДВА человека. "
                    "Обязательно различай двух спикеров и указывай «Оператор» или «Клиент» перед каждой репликой. "
                    "Если клиент представился, используй его имя/название."
                )
            
            # Выбираем ключ промпта
            prompt_key = "transcribe"
            if direction:
                d_lower = direction.lower()
                if "входящий" in d_lower or "incoming" in d_lower:
                    prompt_key = "transcribe_incoming"
                elif "исходящий" in d_lower or "outgoing" in d_lower:
                    prompt_key = "transcribe_outgoing"
            
            transcribe_prompt = get_prompt(
                prompt_key,
                "Транскрибируй этот аудиофайл. Верни только текст разговора с разделением по репликам."
            )
            
            result_text = _make_artemox_request(
                audio_path=audio_path,
                text_prompt=transcribe_prompt,
                system_instruction=system_instruction,
                model="gemini-2.5-pro"
            )
            
            if result_text:
                print(f"--- [ARTEMOX] Транскрибация успешна через artemox.com ---")
                return result_text
            else:
                print(f"--- [ARTEMOX] Ошибка транскрибации через artemox.com ---")
                return None
        except Exception as e:
            print(f"--- [ARTEMOX] ERROR in transcribe_audio: {e} ---")
            import traceback
            traceback.print_exc()
            return None
    
    print(f"--- [GEMINI] Transcribe Audio: {audio_path.name} ---")
    try:
        model_conf = get_model_config()
        model_id = model_conf["id"]
        rpm = model_conf["rpm"]
        
        print(f"--- [GEMINI] Using model: {model_conf['name']} ({model_id}), RPM limit: {rpm} ---")

        # Формируем системную инструкцию для ролей и правил
        system_instruction = (
            "Ты профессиональный транскрибатор аудиозвонков. Твоя задача — максимально точно передать речь в текст, "
            "разделяя спикеров. Ты не должен фантазировать, додумывать или добавлять текст, которого нет в аудио.\n"
            "Структура ответа: только текст диалога, каждая реплика с новой строки."
        )

        operator_name = _resolve_operator_name(
            str(operator_internal_number).strip() if operator_internal_number else None
        )
        
        if operator_name and operator_internal_number:
            system_instruction += (
                f"\n\nВАЖНО: В разговоре участвуют ДВА человека - оператор и клиент. "
                f"Имя оператора: {operator_name}. "
                f"Используй имя «{operator_name}» ТОЛЬКО для реплик оператора. "
                f"Для реплик клиента: если клиент представился (назвал своё имя, фамилию, название организации или компании), "
                f"используй это имя/название вместо слова «Клиент» (например: «Иван Петров: ...» или «ООО Компания: ...»). "
                f"Если клиент не представился, используй обозначение «Клиент». "
                f"Обязательно различай двух спикеров и указывай правильное имя/обозначение перед каждой репликой."
            )
        elif operator_internal_number:
            system_instruction += (
                f"\n\nВАЖНО: В разговоре участвуют ДВА человека - оператор и клиент. "
                f"Внутренний номер оператора: {operator_internal_number}. "
                f"Для реплик оператора используй обозначение «Оператор». "
                f"Для реплик клиента: если клиент представился, используй его имя/название. "
                f"Если клиент не представился, используй обозначение «Клиент»."
            )
        else:
            system_instruction += (
                "\n\nВАЖНО: В разговоре участвуют ДВА человека. "
                "Обязательно различай двух спикеров и указывай «Оператор» или «Клиент» перед каждой репликой. "
                "Если клиент представился, используй его имя/название."
            )

        model = GenerativeModel(
            model_id,
            system_instruction=system_instruction
        )
        
        # Читаем файл для inline передачи (File API недоступен из-за локации)
        file_size = audio_path.stat().st_size
        print(f"--- [GEMINI] Reading file for inline upload ({file_size} bytes)... ---")
        
        audio_data = {
            "mime_type": "audio/mp3",
            "data": audio_path.read_bytes()
        }
        
        # Выбираем ключ промпта в зависимости от направления
        prompt_key = "transcribe"
        if direction:
            d_lower = direction.lower()
            if "входящий" in d_lower or "incoming" in d_lower:
                prompt_key = "transcribe_incoming"
            elif "исходящий" in d_lower or "outgoing" in d_lower:
                prompt_key = "transcribe_outgoing"

        print(f"--- [GEMINI] Using prompt key: {prompt_key} ---")

        # Получаем промпт из базы данных (это будет сообщение пользователя)
        transcribe_prompt = get_prompt(
            prompt_key,
            "Транскрибируй этот аудиофайл. Верни только текст разговора с разделением по репликам."
        )
        
        # Fallback
        if not transcribe_prompt and prompt_key != "transcribe":
             transcribe_prompt = get_prompt("transcribe", "")

        # Настройки безопасности - отключаем все фильтры
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Используем функцию с повторными попытками
        # Устанавливаем низкую температуру для фактологической точности
        print(f"--- [GEMINI] Sending generation request with temperature=0.1... ---")
        try:
            response = _make_gemini_request(
                model, 
                [transcribe_prompt, audio_data], 
                rpm,
                model_id=model_id,
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1},
                safety_settings=safety_settings
            )
            print(f"--- [GEMINI] Response received. ---")
        except ArtemoxFallbackException:
            # Переключаемся на artemox.com
            print(f"--- [ARTEMOX] Использование резервного API для транскрибации... ---")
            result_text = _make_artemox_request(
                audio_path=audio_path,
                text_prompt=transcribe_prompt,
                system_instruction=system_instruction,
                model="gemini-2.5-pro"
            )
            if result_text:
                print(f"--- [ARTEMOX] Транскрибация успешна через artemox.com ---")
                return result_text
            else:
                print(f"--- [ARTEMOX] Ошибка транскрибации через artemox.com ---")
                return None
        
        # Проверяем наличие кандидатов и finish_reason
        if not response.candidates:
            print(f"--- [GEMINI] WARN: No candidates in response ---")
            return None
        
        candidate = response.candidates[0]
        finish_reason = candidate.finish_reason
        
        # Проверяем finish_reason
        # В новой версии библиотеки finish_reason может быть строкой или числом
        # 1 или "SAFETY" - контент заблокирован фильтрами безопасности
        # 0 или "STOP" - нормальное завершение
        finish_reason_str = str(finish_reason).upper() if finish_reason is not None else ""
        is_safety_block = (finish_reason == 1 or finish_reason_str == "SAFETY" or 
                          finish_reason_str == "1" or str(finish_reason) == "1")
        is_stop = (finish_reason == 0 or finish_reason_str == "STOP" or 
                  finish_reason_str == "0" or str(finish_reason) == "0")
        
        if is_safety_block:  # SAFETY - контент заблокирован
            print(f"--- [GEMINI] WARN: Content blocked by safety filters (finish_reason={finish_reason}) ---")
            # Пробуем получить текст даже если был блок безопасности
            # Иногда модель все равно возвращает частичный результат
            try:
                if hasattr(response, 'text') and response.text:
                    print(f"--- [GEMINI] INFO: Partial content available despite safety block ---")
                    return response.text
            except:
                pass
            return None
        elif not is_stop and finish_reason_str:  # Не STOP и не пустое
            print(f"--- [GEMINI] WARN: Unexpected finish_reason: {finish_reason} ---")
        
        # Проверяем наличие текста в ответе
        if not candidate.content or not candidate.content.parts:
            print(f"--- [GEMINI] WARN: No content parts in response ---")
            return None
        
        result_text = response.text
        
        return result_text
    except Exception as e:
        print(f"--- [GEMINI] ERROR in transcribe_audio: {e} ---")
        import traceback
        traceback.print_exc()
        return None


def generate_summary(transcript_text: str) -> Dict[str, Any]:
    """
    Генерирует саммари разговора через Gemini API.
    """
    # Если уже переключились на artemox, используем его сразу
    if _use_artemox and app_config.settings.ARTEMOX_API_KEY:
        print(f"--- [ARTEMOX] Generating Summary (уже используется artemox) ---")
        prompt = get_prompt(
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
Оцени по тону речи, конфликтности, вежливости, эмоциональности.

6. Определи уровень уверенности анализа.
Значение от 0.0 до 1.0 (число).
0.90+ — если уверен почти полностью
0.50 — если есть неоднозначность
0.20 — почти нет данных

7. Сформируй краткое саммари.
Требования:
1 предложение
до 100 символов
должно содержать суть звонка, его основную цель и результат, если он есть
никакой воды

Примеры:
"Клиент уточнил стоимость услуги и получил консультацию."
"Поставщик предложил условия сотрудничества, менеджер взял контакты."

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
{transcript_text}"""
        )
        prompt = prompt.replace("{transcript_text}", transcript_text)
        
        content = _make_artemox_request(
            text_prompt=prompt,
            system_instruction=None,
            model="gemini-2.5-pro"
        )
        if not content:
            print(f"--- [ARTEMOX] Ошибка генерации саммари через artemox.com ---")
            return {
                "title": "Разговор",
                "sentiment": "Нейтральный",
                "confidence": 0.5,
                "summary": "",
                "caller_name": None,
                "call_type": None,
                "call_topic": None,
            }
        content = content.strip()
    else:
        print(f"--- [GEMINI] Generating Summary ---")
        try:
            model_conf = get_model_config()
            model_id = model_conf["id"]
            rpm = model_conf["rpm"]
            
            print(f"--- [GEMINI] Using model: {model_conf['name']} ({model_id}) ---")
            
            model = GenerativeModel(model_id)
            
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
обязательно укажи имя звонящего (или “Неизвестный”)
обязательно укажи тип звонка
Пример:
Иван Петров — звонок клиента
ООО Альфа — поставщик

5. Определи тональность разговора.
Используй строго один вариант:
"Позитивный"
"Нейтральный"
"Негативный"
Оцени по тону речи, конфликтности, вежливости, эмоциональности.

6. Определи уровень уверенности анализа.
Значение от 0.0 до 1.0 (число).
0.90+ — если уверен почти полностью
0.50 — если есть неоднозначность
0.20 — почти нет данных

7. Сформируй краткое саммари.
Требования:
1 предложение
до 100 символов
должно содержать суть звонка, его основную цель и результат, если он есть
никакой воды

Примеры:
"Клиент уточнил стоимость услуги и получил консультацию."
"Поставщик предложил условия сотрудничества, менеджер взял контакты."

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
{transcript_text}"""
            )
            
            # Заменяем плейсхолдер {transcript_text} на реальный текст
            prompt = summary_prompt_template.replace("{transcript_text}", transcript_text)

            # Используем функцию с повторными попытками
            print(f"--- [GEMINI] Sending summary request... ---")
            try:
                response = _make_gemini_request(model, prompt, rpm, model_id=model_id)
                print(f"--- [GEMINI] Summary response received. Processing JSON... ---")
                content = response.text.strip()
            except ArtemoxFallbackException:
                # Переключаемся на artemox.com
                print(f"--- [ARTEMOX] Использование резервного API для генерации саммари... ---")
                content = _make_artemox_request(
                    text_prompt=prompt,
                    system_instruction=None,
                    model="gemini-2.5-pro"
                )
                if not content:
                    print(f"--- [ARTEMOX] Ошибка генерации саммари через artemox.com ---")
                    raise Exception("Failed to generate summary via artemox")
                content = content.strip()
        except Exception as e:
            print(f"Ошибка генерации саммари через Gemini: {e}")
            return {
                "title": "Разговор",
                "sentiment": "Нейтральный",
                "confidence": 0.5,
                "summary": "",
                "caller_name": None,
                "call_type": None,
                "call_topic": None,
            }
        
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
        # Ищем первую открывающую скобку и соответствующую закрывающую
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
        
        # Дополнительная очистка: убираем возможные префиксы/суффиксы
        content = content.strip()
        if content.startswith("json"):
            content = content[4:].strip()
        if content.startswith("JSON"):
            content = content[4:].strip()
            
        # Исправление частой ошибки Gemini: лишняя запятая перед закрывающей скобкой
        # Пример: { "key": "value", } -> { "key": "value" }
        content = re.sub(r',\s*}', '}', content)
        
        # Пытаемся распарсить JSON
        try:
            result = json.loads(content)
        except json.JSONDecodeError as json_err:
            # Если не получилось, выводим ошибку и используем значения по умолчанию
            print(f"Не удалось распарсить JSON. Ошибка: {json_err}")
            print(f"Содержимое (первые 500 символов): {content[:500]}")
            raise json_err
        
        return {
            "title": result.get("title", "Разговор"),
            "sentiment": result.get("sentiment", "Нейтральный"),
            "confidence": float(result.get("confidence", 0.8)),
            "summary": result.get("summary", ""),
            "caller_name": result.get("caller_name"),
            "call_type": result.get("call_type"),
            "call_topic": result.get("call_topic"),
        }
