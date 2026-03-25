import numpy as np
import soundfile as sf

# Генерируем 3 секунды синусоиды (440 Hz - нота A)
sample_rate = 16000
duration = 3
t = np.linspace(0, duration, int(sample_rate * duration))
audio = 0.5 * np.sin(2 * np.pi * 440 * t)

# Добавляем немного шума
noise = np.random.normal(0, 0.05, audio.shape)
audio_noisy = audio + noise

# Сохраняем
sf.write('test_audio.wav', audio_noisy, sample_rate)
print("Тестовый файл создан: test_audio.wav")
