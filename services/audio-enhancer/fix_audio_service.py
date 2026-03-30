#!/usr/bin/env python3
"""
Скрипт для диагностики и исправления проблем с аудио сервисом.
"""

import subprocess
import sys
import os

def run_command(cmd, capture_output=True):
    """Выполняет команду и возвращает результат."""
    try:
        result = subprocess.run(cmd, capture_output=capture_output, text=True, check=True)
        if result.stdout is not None:
            return result.stdout.strip()
        else:
            return ""
    except subprocess.CalledProcessError as e:
        if e.stderr is not None:
            return f"Error: {e.stderr.strip()}"
        else:
            return f"Error: {e}"

def check_python_version():
    """Проверяет версию Python."""
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Требуется Python 3.8+")
        return False
    print("✅ Версия Python подходит")
    return True

def check_torch_version():
    """Проверяет версию PyTorch."""
    try:
        import torch
        import torchaudio
        print(f"PyTorch version: {torch.__version__}")
        print(f"TorchAudio version: {torchaudio.__version__}")
        
        torch_version = torch.__version__.split('+')[0]  # Убираем +cu124
        
        # Используем SpecifierSet для проверки совместимости
        from packaging.specifiers import SpecifierSet
        spec = SpecifierSet(">=2.0.0,<2.6.0")
        
        if spec.contains(torch_version):
            print("✅ Версия PyTorch совместима")
            return True
        else:
            print("⚠️ Версия PyTorch может быть несовместима")
            return True
    except ImportError as e:
        print(f"❌ PyTorch не установлен: {e}")
        return False

def check_pyannote():
    """Проверяет установку Pyannote."""
    try:
        from pyannote.audio import Pipeline
        print("✅ Pyannote.audio установлен")
        
        # Проверяем версию
        try:
            import pyannote.audio
            version = pyannote.audio.__version__
            print(f"Pyannote.audio version: {version}")
            
            # Проверяем соответствие версии требуемому диапазону
            from packaging.version import Version
            from packaging.specifiers import SpecifierSet
            
            spec = SpecifierSet(">=3.0.0,<3.2.0")
            if spec.contains(version):
                print("✅ Версия Pyannote.audio соответствует требованиям")
                return True
            else:
                print(f"⚠️ Версия Pyannote.audio {version} не соответствует требованиям {spec}")
                return False
        except Exception as version_error:
            print(f"⚠️ Не удалось проверить версию Pyannote.audio: {version_error}")
            return False
            
    except ImportError as e:
        print(f"❌ Pyannote.audio не установлен: {e}")
        return False
    except Exception as e:
        print(f"❌ Ошибка при проверке Pyannote.audio: {e}")
        return False

def check_hf_token():
    """Проверяет наличие HuggingFace токена."""
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        print("✅ HF_TOKEN найден в переменных окружения")
        return True
    else:
        print("⚠️ HF_TOKEN не найден в переменных окружения")
        print("   Pyannote диаризация будет недоступна")
        return False

def install_requirements():
    """Устанавливает требования."""
    print("\n📦 Установка зависимостей...")
    result = run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    print(result)
    return "Error" not in result

def test_imports():
    """Тестирует импорты основных модулей."""
    print("\n🧪 Тестирование импортов...")
    
    modules = [
        ("torch", "PyTorch"),
        ("torchaudio", "TorchAudio"),
        ("librosa", "Librosa"),
        ("soundfile", "SoundFile"),
        ("noisereduce", "NoiseReduce"),
        ("pyloudnorm", "LoudNorm"),
        ("pedalboard", "Pedalboard"),
    ]
    
    results = {}
    for module, name in modules:
        try:
            __import__(module)
            print(f"✅ {name}")
            results[module] = True
        except ImportError as e:
            print(f"❌ {name}: {e}")
            results[module] = False
    
    # Проверяем опциональные модули
    optional = [
        ("df.enhance", "DeepFilterNet"),
        ("nara_wpe", "NARA WPE"),
        ("pyannote.audio", "Pyannote"),
    ]
    
    print("\n🔧 Опциональные модули:")
    for module, name in optional:
        try:
            if module == "df.enhance":
                from df.enhance import enhance, init_df
            elif module == "nara_wpe":
                import nara_wpe as wpe
            elif module == "pyannote.audio":
                from pyannote.audio import Pipeline
            
            print(f"✅ {name}")
            results[module] = True
        except ImportError as e:
            print(f"⚠️ {name}: {e}")
            results[module] = False
    
    return results

def main():
    """Основная функция."""
    print("🔍 Диагностика Audio Enhancer сервиса\n")
    
    # Базовые проверки
    checks_passed = True
    checks_passed &= check_python_version()
    checks_passed &= check_torch_version()
    checks_passed &= check_pyannote()
    check_hf_token()  # Это предупреждение, не критично
    
    # Тестирование импортов
    import_results = test_imports()
    
    # Если есть проблемы с зависимостями, предлагаем установить
    failed_imports = [mod for mod, success in import_results.items() if not success]
    if failed_imports:
        print(f"\n⚠️ Проблемы с импортами: {', '.join(failed_imports)}")
        
        response = input("\n❓ Установить зависимости? (y/N): ")
        if response.lower() == 'y':
            if install_requirements():
                print("✅ Зависимости установлены")
                # Повторная проверка
                test_imports()
            else:
                print("❌ Ошибка установки зависимостей")
                checks_passed = False
    
    print("\n" + "="*50)
    if checks_passed:
        print("✅ Диагностика пройдена успешно")
        print("\n🚀 Запуск сервиса:")
        print("   python main.py")
        print("\n🌐 Документация:")
        print("   http://localhost:8000/docs")
    else:
        print("❌ Обнаружены проблемы")
        print("\n📝 Решения:")
        print("   1. Установите Python 3.8+")
        print("   2. Установите зависимости: pip install -r requirements.txt")
        print("   3. Установите HF_TOKEN для диаризации")
    
    return checks_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
