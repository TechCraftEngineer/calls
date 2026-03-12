"""Клиент для работы с Assembly AI API."""

from __future__ import annotations

import assemblyai as aai
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.core import config as app_config

# Настройка API ключа из переменных окружения
ASSEMBLYAI_API_KEY = app_config.settings.ASSEMBLYAI_API_KEY
aai.settings.api_key = ASSEMBLYAI_API_KEY


def transcribe_audio(
    audio_path: Path,
    operator_internal_number: Optional[str] = None,
    direction: Optional[str] = None
) -> Optional[str]:
    """
    Транскрибирует аудио файл через Assembly AI API.
    
    Args:
        audio_path: Путь к MP3 файлу
        operator_internal_number: Внутренний номер оператора (для определения имени)
        direction: Направление звонка (Входящий/Исходящий)
        
    Returns:
        Текст транскрипции с разделением по спикерам или None в случае ошибки
    """
    print(f"--- [ASSEMBLYAI] Transcribe Audio: {audio_path.name} ---")
    
    try:
        # Настройка конфигурации транскрибации
        config_transcribe = aai.TranscriptionConfig(
            speaker_labels=True,  # Включаем диаризацию (разделение говорящих)
            format_text=True,  # Форматируем текст
            punctuate=True,  # Добавляем пунктуацию
            language_detection=True,  # Автоопределение языка
            speakers_expected=2,  # Ожидаем 2 спикера (оператор и клиент)
        )
        config_transcribe.speech_models = ["universal"]
        
        # Создаем транскрибер
        transcriber = aai.Transcriber(config=config_transcribe)
        
        # Загружаем файл на сервер Assembly AI
        print(f"--- [ASSEMBLYAI] Uploading file... ---")
        upload_url = transcriber.upload_file(str(audio_path))
        print(f"--- [ASSEMBLYAI] File uploaded, starting transcription... ---")
        
        # Запускаем транскрибацию
        transcript = transcriber.transcribe(upload_url)
        
        # Проверяем статус
        if transcript.status == aai.TranscriptStatus.error:
            error_msg = f"Transcription failed: {transcript.error}"
            print(f"--- [ASSEMBLYAI] ERROR: {error_msg} ---")
            return None
        
        # Получаем текст транскрибации
        transcript_text = transcript.text
        
        if not transcript_text:
            print(f"--- [ASSEMBLYAI] WARN: Transcription completed but text is empty ---")
            return ""
        
        # Сохраняем полный ответ от Assembly AI в файл
        _save_assemblyai_response(audio_path, transcript)
        
        # Форматируем текст с разделением по спикерам, если доступна диаризация
        if hasattr(transcript, 'utterances') and transcript.utterances:
            # Получаем имя оператора, если доступно
            operator_name = None
            if operator_internal_number:
                try:
                    from .storage import SQLiteStorage
                    storage = SQLiteStorage()
                    operator_name = storage.get_operator_name_by_internal_number(operator_internal_number)
                except Exception as e:
                    print(f"--- [ASSEMBLYAI] WARN: Could not get operator name: {e} ---")
            
            # Форматируем с разделением по спикерам
            formatted_text = _format_transcript_with_speakers(
                transcript.utterances,
                operator_name=operator_name
            )
            
            print(f"--- [ASSEMBLYAI] Transcription successful with speaker labels ---")
            return formatted_text
        else:
            # Если диаризация недоступна, возвращаем обычный текст
            print(f"--- [ASSEMBLYAI] Transcription successful (no speaker labels) ---")
            return transcript_text
            
    except Exception as e:
        print(f"--- [ASSEMBLYAI] ERROR in transcribe_audio: {e} ---")
        import traceback
        traceback.print_exc()
        return None


def _format_transcript_with_speakers(utterances, operator_name: Optional[str] = None) -> str:
    """
    Форматирует транскрипт с разделением по спикерам в формате [A]: текст.
    Добавляет пустую строку между репликами разных спикеров.
    
    Args:
        utterances: Список реплик (utterances) из транскрипта
        operator_name: Имя оператора (если известно) - не используется в новом формате
        
    Returns:
        Отформатированный текст в формате [A]: текст, [B]: текст
    """
    formatted_lines = []
    previous_speaker_id = None
    
    # Assembly AI возвращает спикеров в формате "A", "B" (буквы)
    # Форматируем в формат [A]: текст для передачи в DeepSeek
    
    # Собираем все реплики
    for utterance in utterances:
        speaker_id = utterance.speaker
        text = utterance.text.strip()
        
        if not text:
            continue
        
        # Добавляем пустую строку перед репликой, если спикер изменился
        if previous_speaker_id is not None and previous_speaker_id != speaker_id:
            formatted_lines.append("")
        
        # Форматируем в формате [A]: текст или [B]: текст
        formatted_lines.append(f"[{speaker_id}]: {text}")
        
        # Сохраняем текущего спикера для следующей итерации
        previous_speaker_id = speaker_id
    
    return "\n".join(formatted_lines)


def _save_assemblyai_response(audio_path: Path, transcript) -> None:
    """
    Сохраняет полный ответ от Assembly AI в JSON файл для анализа.
    
    Args:
        audio_path: Путь к исходному аудио файлу
        transcript: Объект транскрипта от Assembly AI
    """
    try:
        # Создаем папку для сохранения ответов Assembly AI
        responses_dir = audio_path.parent / "assemblyai_responses"
        responses_dir.mkdir(exist_ok=True)
        
        # Формируем имя файла для сохранения ответа
        audio_stem = audio_path.stem
        response_file = responses_dir / f"{audio_stem}_response.json"
        
        # Собираем данные для сохранения
        response_data = {
            "audio_file": str(audio_path.name),
            "timestamp": datetime.now().isoformat(),
            "status": str(transcript.status) if hasattr(transcript, 'status') else "unknown",
            "text": transcript.text if hasattr(transcript, 'text') else None,
            "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None,
            "words": [
                {
                    "text": word.text,
                    "start": word.start,
                    "end": word.end,
                    "confidence": word.confidence,
                    "speaker": word.speaker if hasattr(word, 'speaker') else None
                }
                for word in (transcript.words if hasattr(transcript, 'words') and transcript.words else [])
            ],
            "utterances": [
                {
                    "speaker": utt.speaker,
                    "text": utt.text,
                    "start": utt.start,
                    "end": utt.end,
                    "confidence": utt.confidence if hasattr(utt, 'confidence') else None
                }
                for utt in (transcript.utterances if hasattr(transcript, 'utterances') and transcript.utterances else [])
            ],
            "language_code": transcript.language_code if hasattr(transcript, 'language_code') else None,
            "error": str(transcript.error) if hasattr(transcript, 'error') and transcript.error else None
        }
        
        # Сохраняем в JSON файл
        with open(response_file, 'w', encoding='utf-8') as f:
            json.dump(response_data, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"--- [ASSEMBLYAI] Response saved to: {response_file.name} ---")
    except Exception as e:
        print(f"--- [ASSEMBLYAI] WARN: Could not save response: {e} ---")

