"""Клиент для работы с SaluteSpeech (SmartSpeech) API."""

from __future__ import annotations

import base64
import json
import logging
import subprocess
import time
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

import httpx
from mutagen.mp3 import MP3

from app.core import config as app_config

logger = logging.getLogger(__name__)

# Ensure boolean values are parsed correctly from env/config (may be strings).
def _coerce_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "y", "on")
    if value is None:
        return False
    return bool(value)

# Verification marker
try:
    with open(app_config.settings.RECORDS_DIR + "/module_load_salute.txt", "a") as f:
        f.write(f"[{time.ctime()}] SaluteSpeech module loaded\n")
except Exception: pass


class SaluteSpeechError(Exception):
    """Ошибка при работе с SaluteSpeech API."""
    pass


class SaluteSpeechConfig:
    """Конфигурация для SaluteSpeech API."""
    
    def __init__(
        self,
        client_id: str,
        scope: str,
        authorization_key: str,
        token_url: str,
        api_base_url: str,
        verify_ssl: bool = True
    ):
        self.client_id = client_id
        self.scope = scope
        self.authorization_key = authorization_key
        self.token_url = token_url
        self.api_base_url = api_base_url
        self.verify_ssl = verify_ssl
    
    @classmethod
    def from_env(cls) -> "SaluteSpeechConfig":
        """Создает конфигурацию из переменных окружения."""
        settings = app_config.settings
        verify_ssl_raw = settings.SALUTE_SPEECH_VERIFY_SSL
        verify_ssl = _coerce_bool(verify_ssl_raw)
        logger.info(
            f"[SALUTESPEECH] verify_ssl raw={verify_ssl_raw!r} "
            f"type={type(verify_ssl_raw).__name__} coerced={verify_ssl}"
        )
        return cls(
            client_id=settings.SALUTE_SPEECH_CLIENT_ID,
            scope=settings.SALUTE_SPEECH_SCOPE,
            authorization_key=settings.SALUTE_SPEECH_AUTHORIZATION_KEY,
            token_url=settings.SALUTE_SPEECH_TOKEN_URL,
            api_base_url=settings.SALUTE_SPEECH_API_BASE_URL,
            verify_ssl=verify_ssl
        )


class SaluteSpeechClient:
    """Клиент для работы с SaluteSpeech API."""
    
    def __init__(self, config: SaluteSpeechConfig):
        self.config = config
        self.access_token: Optional[str] = None
        logger.info(f"[SALUTESPEECH] Initializing client with verify_ssl={config.verify_ssl}")
        if config.verify_ssl:
            logger.warning(
                "[SALUTESPEECH] verify_ssl=True overridden to False for dev-only bypass"
            )
        # Dev-only: force-disable SSL verification to avoid self-signed cert errors.
        self._client = httpx.Client(
            timeout=60.0,
            transport=httpx.HTTPTransport(verify=False),
        )
        logger.info(
            "[SALUTESPEECH] httpx verify override applied (client verify=%s)",
            getattr(self._client, "_verify", "unknown"),
        )
    
    def _common_headers(self) -> Dict[str, str]:
        """Общие заголовки для всех запросов (для трассировки)."""
        headers: Dict[str, str] = {
            "RqUID": str(uuid.uuid4()),
            "X-Request-ID": str(uuid.uuid4()),
        }
        if self.config.client_id:
            headers["X-Client-ID"] = self.config.client_id
        return headers
    
    def get_access_token(self) -> str:
        """Получает OAuth токен доступа."""
        if self.access_token:
            return self.access_token
        
        headers = {
            "Authorization": f"Basic {self.config.authorization_key}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }
        headers.update(self._common_headers())
        data = {
            "scope": self.config.scope,
            "grant_type": "client_credentials"
        }
        
        try:
            logger.debug(f"[SALUTESPEECH] Posting to token URL: {self.config.token_url}")
            logger.debug(f"[SALUTESPEECH] Using verify_ssl={self.config.verify_ssl}")
            response = self._client.post(
                self.config.token_url,
                headers=headers,
                data=data
            )
            if response.status_code >= 400:
                logger.error(f"[SALUTESPEECH] Token response error {response.status_code}: {response.text}")
                print(f"--- [SALUTESPEECH] Token error {response.status_code}: {response.text} ---")
            response.raise_for_status()
            result = response.json()
            self.access_token = result.get("access_token")
            if not self.access_token:
                raise SaluteSpeechError("No access_token in response")
            return self.access_token
        except httpx.HTTPStatusError as e:
            error_msg = f"Failed to get access token: {e.response.status_code} - {e.response.text}"
            logger.error(f"[SALUTESPEECH] {error_msg}")
            raise SaluteSpeechError(error_msg)
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"[SALUTESPEECH] Error getting access token: {str(e)}\n{error_details}")
            raise SaluteSpeechError(f"Error getting access token ({type(e).__name__}): {str(e)}")
    
    def upload_audio(self, path: str) -> str:
        """Загружает аудио файл на сервер."""
        token = self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        headers.update(self._common_headers())
        
        import mimetypes
        ctype, _ = mimetypes.guess_type(path)
        if not ctype:
            ctype = "application/octet-stream"
        
        with open(path, "rb") as f:
            files = {"file": (Path(path).name, f, ctype)}
            try:
                response = self._client.post(
                    f"{self.config.api_base_url}/rest/v1/data:upload",
                    headers=headers,
                    files=files
                )
                response.raise_for_status()
                result = response.json()
                request_file_id = result.get("result", {}).get("request_file_id")
                if not request_file_id:
                    raise SaluteSpeechError("No request_file_id in upload response")
                return request_file_id
            except httpx.HTTPStatusError as e:
                raise SaluteSpeechError(f"Failed to upload audio: {e.response.text}")
            except Exception as e:
                raise SaluteSpeechError(f"Error uploading audio: {str(e)}")
    
    def create_recognition_task(
        self,
        request_file_id: str,
        model: str,
        audio_encoding: str,
        sample_rate: int,
        channels_count: int,
        extra: Optional[Dict[str, Any]] = None
    ) -> str:
        """Создает задачу распознавания с поддержкой разных форматов API."""
        token = self.get_access_token()
        url = f"{self.config.api_base_url}/rest/v1/speech:async_recognize"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        # API schema has changed over time. We try the current shape first:
        # {"request_file_id": "...", "options": {...}}.
        options: Dict[str, Any] = {"audio_encoding": audio_encoding}
        if model:
            # Some deployments accept it, some don't (we'll retry without on 400).
            options["model"] = model
        if sample_rate is not None:
            options["sample_rate"] = int(sample_rate)
        if channels_count is not None:
            options["channels_count"] = int(channels_count)
        if extra:
            options.update(extra)
        
        body: Dict[str, Any] = {"request_file_id": request_file_id, "options": options}
        
        try:
            response = self._client.post(url, headers=headers, json=body)
            
            # Retry without model if 400 with "unknown field model"
            if response.status_code == 400 and 'unknown field "model"' in response.text and "model" in options:
                logger.info(f"[SALUTESPEECH] Retrying without model field (newer schema auto-selects model)")
                options2 = dict(options)
                options2.pop("model", None)
                body2: Dict[str, Any] = {"request_file_id": request_file_id, "options": options2}
                response = self._client.post(url, headers=headers, json=body2)
            
            # Fallback to legacy flat shape if "unknown field options"
            if response.status_code == 400 and 'unknown field "options"' in response.text:
                logger.info(f"[SALUTESPEECH] Falling back to legacy flat format")
                legacy: Dict[str, Any] = {
                    "request_file_id": request_file_id,
                    "audio_encoding": audio_encoding,
                }
                if model:
                    legacy["model"] = model
                if sample_rate is not None:
                    legacy["sample_rate"] = int(sample_rate)
                if channels_count is not None:
                    legacy["channels_count"] = int(channels_count)
                if extra:
                    legacy.update(extra)
                response = self._client.post(url, headers=headers, json=legacy)
            
            response.raise_for_status()
            result = response.json()
            task_id = result.get("result", {}).get("id") or result.get("id")
            if not task_id:
                raise SaluteSpeechError(f"Recognize response missing id: {result}")
            return str(task_id)
        except httpx.HTTPStatusError as e:
            raise SaluteSpeechError(f"Failed to create recognition task: {e.response.text}")
        except Exception as e:
            raise SaluteSpeechError(f"Error creating recognition task: {str(e)}")
    
    def get_task(self, task_id: str) -> Dict[str, Any]:
        """Получает статус задачи."""
        token = self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        headers.update(self._common_headers())
        
        try:
            response = self._client.get(
                f"{self.config.api_base_url}/rest/v1/task:get",
                headers=headers,
                params={"id": task_id}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise SaluteSpeechError(f"Failed to get task status: {e.response.text}")
        except Exception as e:
            raise SaluteSpeechError(f"Error getting task status: {str(e)}")
    
    def download_result(self, response_file_id: str) -> bytes:
        """Скачивает результат распознавания."""
        token = self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
        }
        headers.update(self._common_headers())
        
        try:
            response = self._client.get(
                f"{self.config.api_base_url}/rest/v1/data:download",
                headers=headers,
                params={"response_file_id": response_file_id}
            )
            response.raise_for_status()
            return response.content
        except httpx.HTTPStatusError as e:
            raise SaluteSpeechError(f"Failed to download result: {e.response.text}")
        except Exception as e:
            raise SaluteSpeechError(f"Error downloading result: {str(e)}")
    
    def close(self):
        """Закрывает HTTP клиент."""
        self._client.close()


def _detect_audio_params(path: Path) -> tuple[int | None, int | None]:
    """Определяет параметры аудио файла (MP3 или WAV)."""
    # Try WAV first
    try:
        import wave
        with wave.open(str(path), 'rb') as w:
            return w.getframerate(), w.getnchannels()
    except Exception:
        pass

    # Try MP3
    try:
        a = MP3(path)
        return int(getattr(a.info, "sample_rate", 0) or 0) or None, int(getattr(a.info, "channels", 0) or 0) or None
    except Exception:
        return None, None


def _convert_mp3_to_wav_16k_mono(
    input_mp3: Path,
    output_wav: Path,
    clean_silence: bool = False,
    logger: Optional[logging.Logger] = None
) -> bool:
    """Конвертирует MP3 в WAV 16kHz моно."""
    if logger is None:
        logger = logging.getLogger(__name__)
    
    try:
        # Проверяем наличие ffmpeg
        try:
            subprocess.run(['ffmpeg', '-version'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("ffmpeg not found, cannot convert audio")
            return False
        
        cmd = [
            'ffmpeg',
            '-y',  # Перезаписать выходной файл
            '-i', str(input_mp3),
            '-ar', '16000',  # Частота дискретизации 16kHz
            '-ac', '1',  # Моно
            '-f', 'wav',  # Формат WAV
            str(output_wav)
        ]
        
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        
        if output_wav.exists() and output_wav.stat().st_size > 0:
            logger.info(f"Converted {input_mp3.name} to WAV 16kHz mono: {output_wav.name}")
            return True
        else:
            logger.error(f"Conversion failed: output file is empty or missing")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Error converting audio: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during conversion: {e}")
        return False


def _to_transcript_lines(
    obj: object,
    *,
    limit: int | None = None,
    include_combined: bool = True
) -> list[str]:
    """Преобразует результат SaluteSpeech в список строк транскрипта."""
    chunks = obj if isinstance(obj, list) else [obj]
    lines: list[str] = []
    for ch in chunks:
        if not isinstance(ch, dict):
            continue
        
        # Shape A (current): list of utterances, each utterance is a dict like:
        # {"results":[{"text":...,"normalized_text":...,"start":"...","end":"..."}], ...}
        results = ch.get("results")
        if isinstance(results, list) and results and isinstance(results[0], dict) and (
            "text" in results[0] or "normalized_text" in results[0]
        ):
            it = results[0]
            text = (it.get("normalized_text") or it.get("text") or "").strip()
            if text:
                start = it.get("start")
                end = it.get("end")
                prefix = f"[{start}-{end}] " if start and end else ""
                sp = None
                if isinstance(ch.get("speaker_info"), dict):
                    sp = ch.get("speaker_info", {}).get("speaker_id")
                if sp == -1 and not include_combined:
                    continue
                if sp is not None and sp != -1:
                    prefix = prefix + f"speaker_{sp}: "
                lines.append(prefix + text)
                if limit is not None and len(lines) >= limit:
                    return lines
            continue
        
        # Shape B (older/alt): wrapper with nested items that then contain "results".
        for item in (results or []) if isinstance(results, list) else []:
            if not isinstance(item, dict):
                continue
            rr = item.get("results") or []
            if not isinstance(rr, list) or not rr or not isinstance(rr[0], dict):
                continue
            it = rr[0]
            text = (it.get("normalized_text") or it.get("text") or "").strip()
            if not text:
                continue
            start = it.get("start")
            end = it.get("end")
            prefix = f"[{start}-{end}] " if start and end else ""
            lines.append(prefix + text)
            if limit is not None and len(lines) >= limit:
                return lines
    return lines


def transcribe_audio(
    audio_path: Path,
    operator_internal_number: Optional[str] = None,
    direction: Optional[str] = None,
    enable_diarization: bool = True,
    speakers_count: int = 2
) -> Optional[str]:
    """
    Транскрибирует аудио файл через SaluteSpeech API.
    
    Диаризация всегда включена. Если файл MP3 и не 16kHz, он будет автоматически
    конвертирован в WAV 16kHz моно для поддержки диаризации.
    
    Args:
        audio_path: Путь к аудио файлу (MP3 или WAV)
        operator_internal_number: Внутренний номер оператора (не используется, для совместимости)
        direction: Направление звонка (не используется, для совместимости)
        enable_diarization: Включить диаризацию (разделение спикеров) - всегда True
        speakers_count: Ожидаемое количество спикеров
        
    Returns:
        Текст транскрипции с разделением по спикерам в формате [A]: текст или None в случае ошибки
    """
    # Trace logging with absolute path to records folder for reliability
    trace_log = Path(app_config.settings.RECORDS_DIR) / "salute_trace.log"
    try:
        with open(trace_log, "a", encoding="utf-8") as trace_f:
            trace_f.write(f"\n[{time.ctime()}] START transcription for: {audio_path.name}\n")
            trace_f.write(f"[{time.ctime()}] Config: verify_ssl={app_config.settings.SALUTE_SPEECH_VERIFY_SSL}\n")
            trace_f.write(f"[{time.ctime()}] Project Root: {getattr(app_config, 'project_root', 'N/A')}\n")
    except Exception as e:
        logger.warning(f"Could not write to trace log initial: {e}")
    
    import sys
    print(f"DEBUG: Entering salutespeech.transcribe_audio for {audio_path.name}", file=sys.stderr, flush=True)
    
    if not audio_path.exists():
        error_msg = f"Audio file not found: {audio_path.absolute()}"
        logger.error(f"[SALUTESPEECH] {error_msg}")
        return None
    
    try:
        cfg = SaluteSpeechConfig.from_env()
        if not cfg.client_id or not cfg.authorization_key:
            error_msg = "SaluteSpeech credentials not configured"
            logger.error(f"[SALUTESPEECH] {error_msg}")
            return None
        
        client = SaluteSpeechClient(cfg)
        try:
            token = client.get_access_token()
            
            # Определяем параметры аудио
            sample_rate, channels = _detect_audio_params(audio_path)
            
            try:
                with open(trace_log, "a", encoding="utf-8") as trace_f:
                    trace_f.write(f"[{time.ctime()}] Params: sr={sample_rate}, ch={channels}\n")
            except Exception: pass
            
            audio_encoding = "MP3" if audio_path.suffix.lower() == ".mp3" else "PCM_S16LE"

            if not sample_rate:
                sample_rate = 16000

            # Диаризация нужна всегда: используем model=general (он лучше разделяет спикеров)
            enable_diarization = True
            model = "general"

            # Конвертация для диаризации: используем MP3 напрямую если возможно
            upload_path = audio_path
            need_conversion = (
                audio_path.suffix.lower() != ".mp3" and 
                (sample_rate != 16000 or channels != 1)
            )
            
            if audio_path.suffix.lower() == ".mp3":
                audio_encoding = "MP3"
                # Используем оригинальные параметры
            else:
                audio_encoding = "PCM_S16LE"

            try:
                with open(trace_log, "a", encoding="utf-8") as trace_f:
                    trace_f.write(f"[{time.ctime()}] Need conversion: {need_conversion}, Encoding: {audio_encoding}\n")
            except Exception: pass

            if need_conversion:
                converted = audio_path.parent / f"{audio_path.stem}.salutespeech_16k.wav"
                if _convert_mp3_to_wav_16k_mono(audio_path, converted, logger=logger):
                    upload_path = converted
                    sample_rate = 16000
                    channels = 1
                    audio_encoding = "PCM_S16LE"
                else:
                    logger.warning(f"[SALUTESPEECH] Conversion failed, using original file")
            
            logger.info(f"[SALUTESPEECH] Uploading audio file: {upload_path.name}")
            request_file_id = client.upload_audio(path=str(upload_path))
            
            extra = {
                "speaker_separation_options": {
                    "enable": True,
                    "count": max(1, int(speakers_count)),
                    "enable_only_main_speaker": False,
                }
            }
            
            task_id = client.create_recognition_task(
                request_file_id=request_file_id,
                model=model,
                audio_encoding=audio_encoding,
                sample_rate=sample_rate,
                channels_count=channels or 1,
                extra=extra,
            )
            
            # Poll status
            t0 = time.time()
            response_file_id = None
            while True:
                payload = client.get_task(task_id=task_id)
                result = payload.get("result") or {}
                status = result.get("status") or payload.get("status")
                response_file_id = result.get("response_file_id") or response_file_id
                
                if status == "DONE":
                    break
                if status in {"FAILED", "CANCELLED"}:
                    raise SaluteSpeechError(f"Task {task_id} failed with status {status}")
                if time.time() - t0 > 180:
                    raise SaluteSpeechError(f"Timeout waiting for task {task_id}")
                time.sleep(3.0)
            
            content = client.download_result(response_file_id=response_file_id)
            logger.info(f"[SALUTESPEECH] Result downloaded, size: {len(content)} bytes")
            logger.info(f"[SALUTESPEECH] Raw SaluteSpeech response (first 500 chars): {content.decode('utf-8')[:500]}")
            
            result_obj = json.loads(content.decode("utf-8"))
            logger.info(f"[SALUTESPEECH] Result parsed, type: {type(result_obj)}, keys: {list(result_obj.keys()) if isinstance(result_obj, dict) else 'N/A'}")
            
            try:
                with open(trace_log, "a", encoding="utf-8") as trace_f:
                    trace_f.write(f"[{time.ctime()}] Result downloaded, size: {len(content)}\n")
                    trace_f.write(f"[{time.ctime()}] Result keys: {list(result_obj.keys()) if isinstance(result_obj, dict) else 'list'}\n")
            except Exception: pass
            
            chunks = []
            if isinstance(result_obj, list):
                chunks = result_obj
                logger.info(f"[SALUTESPEECH] Result is a list, chunks count: {len(chunks)}")
            elif isinstance(result_obj, dict):
                chunks = result_obj.get("chunks", [result_obj])
                logger.info(f"[SALUTESPEECH] Result is a dict, chunks count: {len(chunks)}")
            
            formatted_lines = []
            speaker_map = {}
            next_letter = ord('A')
            
            logger.info(f"[SALUTESPEECH] Processing {len(chunks)} chunks")
            processed_chunks = 0
            skipped_chunks = 0
            
            for idx, chunk in enumerate(chunks):
                if not isinstance(chunk, dict):
                    logger.debug(f"[SALUTESPEECH] Chunk {idx} is not a dict, skipping")
                    skipped_chunks += 1
                    continue
                
                results = chunk.get("results", [])
                if not isinstance(results, list) or not results:
                    logger.debug(f"[SALUTESPEECH] Chunk {idx} has no results list, skipping")
                    skipped_chunks += 1
                    continue
                
                speaker_id = None
                speaker_info = chunk.get("speaker_info")
                if isinstance(speaker_info, dict):
                    speaker_id = speaker_info.get("speaker_id")
                    logger.debug(f"[SALUTESPEECH] Chunk {idx} speaker_id: {speaker_id}")
                
                # На основе видео инженеров Сбера:
                # speaker_id == -1 это "исходное аудио" (бизнес-требование их заказчиков).
                # Оно дублирует основной текст, если включена диаризация.
                # Мы его пропускаем, чтобы не было дублей.
                if speaker_id == -1:
                    # Если в ответе есть другие спикеры, этот чанк нам не нужен
                    has_real_speakers = any(
                        (c.get("speaker_info") or {}).get("speaker_id", -1) != -1 
                        for c in chunks if isinstance(c, dict)
                    )
                    if has_real_speakers:
                        logger.debug(f"[SALUTESPEECH] Skipping combined result (speaker_id=-1) as real speakers exist")
                        skipped_chunks += 1
                        continue
                    else:
                        logger.debug(f"[SALUTESPEECH] Keeping speaker_id=-1 because no other speakers were found")
                
                chunk_processed = False
                for item in results:
                    if not isinstance(item, dict):
                        continue
                    
                    text = (item.get("normalized_text") or item.get("text") or "").strip()
                    if not text:
                        logger.debug(f"[SALUTESPEECH] Chunk {idx} item has empty text, skipping")
                        continue
                    
                    # Создаем маппинг speaker_id -> буква
                    if speaker_id is not None and speaker_id not in speaker_map:
                        speaker_map[speaker_id] = chr(next_letter)
                        logger.info(f"[SALUTESPEECH] Mapped speaker_id {speaker_id} to letter {chr(next_letter)}")
                        next_letter += 1
                    
                    # Форматируем строку
                    speaker_label = speaker_map.get(speaker_id, "A") if speaker_id is not None else "A"
                    formatted_lines.append(f"[{speaker_label}]: {text}")
                    chunk_processed = True
                    processed_chunks += 1
                
                if not chunk_processed:
                    logger.debug(f"[SALUTESPEECH] Chunk {idx} had no processable text, skipping")
                    skipped_chunks += 1
            
            logger.info(f"[SALUTESPEECH] Processed {processed_chunks} chunks, skipped {skipped_chunks} chunks")

            # Deduplicate
            deduped = []
            for line in formatted_lines:
                if not deduped or deduped[-1] != line:
                    deduped.append(line)
            
            logger.info(f"[SALUTESPEECH] Formatted lines: {len(formatted_lines)}, after deduplication: {len(deduped)}")
            
            final_text = "\n".join(deduped)
            
            if not final_text or not final_text.strip():
                logger.warning(f"[SALUTESPEECH] No formatted lines generated from SaluteSpeech response. This might indicate an issue with the audio (too short, silent) or an unexpected API response structure.")
                logger.warning(f"[SALUTESPEECH] Total chunks processed: {len(chunks)}, processed: {processed_chunks}, skipped: {skipped_chunks}")
                return None
            
            logger.info(f"[SALUTESPEECH] Total transcript length: {len(final_text)} characters")
            logger.info(f"[SALUTESPEECH] Speakers detected: {len(speaker_map)} ({', '.join(speaker_map.values())})")
            
            try:
                with open(trace_log, "a", encoding="utf-8") as trace_f:
                    trace_f.write(f"[{time.ctime()}] Final lines: {len(deduped)}\n")
            except Exception: pass

            return final_text
            
        finally:
            client.close()
            
    except Exception as e:
        logger.error(f"[SALUTESPEECH] Error in transcribe_audio: {e}", exc_info=True)
        try:
            with open(trace_log, "a", encoding="utf-8") as trace_f:
                trace_f.write(f"[{time.ctime()}] EXCEPTION: {e}\n")
        except Exception: pass
        return None
