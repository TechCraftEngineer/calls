"""Проверка запуска audio-enhancer."""

import uvicorn
from main import app

if __name__ == "__main__":
    print("Запуск Audio Enhancer...")
    uvicorn.run(app, host="0.0.0.0", port=7860)
