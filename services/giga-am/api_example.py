import requests
import json
import os
from typing import Dict, Any

# Базовый URL API
# Для локальной разработки: http://localhost:7860
# Для HuggingFace Space: https://vnggncb-giga-am.hf.space
BASE_URL = "https://vnggncb-giga-am.hf.space"
API_URL = f"{BASE_URL}/api/transcribe"
HEALTH_URL = f"{BASE_URL}/api/health"
INFO_URL = f"{BASE_URL}/api/info"

class GigaAMClient:
    """Клиент для взаимодействия с GigaAM API"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/transcribe"
        self.health_url = f"{base_url}/api/health"
        self.info_url = f"{base_url}/api/info"
    
    def health_check(self) -> Dict[str, Any]:
        """Проверка работоспособности API"""
        try:
            response = requests.get(self.health_url)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": f"Ошибка подключения: {e}"}
    
    def get_app_info(self) -> Dict[str, Any]:
        """Получение информации о приложении"""
        try:
            response = requests.get(self.info_url)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": f"Ошибка подключения: {e}"}
    
    def transcribe_file(self, file_path: str) -> Dict[str, Any]:
        """
        Распознавание речи из аудиофайла
        
        Args:
            file_path: Путь к аудиофайлу
            
        Returns:
            Результат распознавания
        """
        if not os.path.exists(file_path):
            return {"error": f"Файл не найден: {file_path}"}
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'audio/mpeg')}
                response = requests.post(self.api_url, files=files)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "error": f"HTTP ошибка {response.status_code}",
                    "detail": response.text
                }
                
        except requests.RequestException as e:
            return {"error": f"Ошибка запроса: {e}"}
        except Exception as e:
            return {"error": f"Внутренняя ошибка: {e}"}
    
    def print_transcription_result(self, result: Dict[str, Any]):
        """Красивый вывод результата распознавания"""
        if "error" in result:
            print(f"❌ Ошибка: {result['error']}")
            return
        
        if not result.get("success"):
            print(f"❌ Распознавание не удалось: {result.get('error', 'Неизвестная ошибка')}")
            return
        
        print(f"✅ Распознавание успешно завершено!")
        print(f"📊 Всего сегментов: {len(result['segments'])}")
        print(f"⏱️ Общая длительность: {result.get('total_duration', 0):.2f} сек")
        print("\n📝 Распознанный текст:")
        print("=" * 50)
        
        for i, segment in enumerate(result["segments"], 1):
            print(f"{i:2d}. [{segment['start_formatted']} - {segment['end_formatted']}]: {segment['text']}")
        
        print("=" * 50)


def main():
    """Основная функция с примерами использования"""
    
    # Создаем клиент
    client = GigaAMClient()
    
    print("🎤 GigaAM API Клиент")
    print("=" * 30)
    
    # 1. Проверка работоспособности
    print("\n1. Проверка работоспособности API...")
    health = client.health_check()
    if "error" not in health:
        print(f"✅ API работает! Статус: {health.get('status')}")
        print(f"📦 Модель: {health.get('model', {}).get('model_name', 'Unknown')}")
    else:
        print(f"❌ API недоступно: {health['error']}")
        return
    
    # 2. Получение информации о приложении
    print("\n2. Информация о приложении...")
    info = client.get_app_info()
    if "error" not in info:
        print(f"📱 Приложение: {info.get('app_name')} v{info.get('version')}")
        print(f"📁 Поддерживаемые форматы: {', '.join(info.get('supported_formats', []))}")
        print(f"📏 Макс. размер файла: {info.get('max_file_size_mb')}MB")
    
    # 3. Пример распознавания файла
    print("\n3. Распознавание аудиофайла...")
    
    # Замените на путь к вашему аудиофайлу
    test_file = "audio.mp3"  # Измените на реальный путь
    
    if not os.path.exists(test_file):
        print(f"⚠️  Тестовый файл '{test_file}' не найден.")
        print("Создайте тестовый аудиофайл или измените переменную test_file")
        
        # Показываем поддерживаемые форматы
        if "error" not in info:
            print(f"\nПоддерживаемые форматы: {', '.join(info.get('supported_formats', []))}")
    else:
        print(f"📁 Обработка файла: {test_file}")
        result = client.transcribe_file(test_file)
        client.print_transcription_result(result)
    
    # 4. Пример с другим файлом (раскомментируйте при необходимости)
    # print("\n4. Распознавание другого файла...")
    # another_file = "speech.wav"
    # if os.path.exists(another_file):
    #     result = client.transcribe_file(another_file)
    #     client.print_transcription_result(result)
    
    print("\n🎉 Примеры завершены!")


if __name__ == "__main__":
    main()
