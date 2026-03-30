#!/usr/bin/env python3
"""
Тест для проверки синтаксиса и структуры app.py
"""

import ast
import sys
from pathlib import Path

def test_app_syntax():
    """Проверка синтаксиса app.py"""
    app_path = Path(__file__).parent / "app.py"
    
    try:
        with open(app_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Парсинг AST для проверки синтаксиса
        ast.parse(content)
        print("✅ Синтаксис app.py корректен")
        return True
        
    except SyntaxError as e:
        print(f"❌ Синтаксическая ошибка в app.py: {e}")
        print(f"   Строка {e.lineno}: {e.text}")
        return False
    except Exception as e:
        print(f"❌ Ошибка при проверке app.py: {e}")
        return False

def test_indentation():
    """Проверка отступов в app.py"""
    app_path = Path(__file__).parent / "app.py"
    
    try:
        with open(app_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        indent_errors = []
        for i, line in enumerate(lines, 1):
            if line.strip() == "":
                continue  # Пропускаем пустые строки
            
            # Проверяем на смешивание табов и пробелов
            if '\t' in line and ' ' in line[:len(line) - len(line.lstrip())]:
                indent_errors.append(f"Строка {i}: Смешивание табов и пробелов")
        
        if indent_errors:
            print("❌ Найдены ошибки отступов:")
            for error in indent_errors:
                print(f"   {error}")
            return False
        else:
            print("✅ Отступы в app.py корректны")
            return True
            
    except Exception as e:
        print(f"❌ Ошибка при проверке отступов: {e}")
        return False

def main():
    """Основная функция"""
    print("🧪 Проверка синтаксиса и структуры app.py")
    print("=" * 50)
    
    syntax_ok = test_app_syntax()
    indentation_ok = test_indentation()
    
    if syntax_ok and indentation_ok:
        print("\n🎉 Все проверки пройдены! app.py готов к запуску.")
        return 0
    else:
        print("\n❌ Найдены проблемы. Исправьте их перед запуском.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
