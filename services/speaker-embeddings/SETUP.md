# Настройка Speaker Embeddings Service

## Проблема

Сервис не мог загрузить pyannote модель из-за:
1. Отсутствия правильной инициализации (нужно использовать `Model.from_pretrained()` + `Inference()`)
2. Отсутствия HuggingFace токена для доступа к gated модели

## Решение

### 1. Получите HuggingFace токен

1. Зарегистрируйтесь на https://huggingface.co
2. Создайте токен: https://huggingface.co/settings/tokens
3. Примите условия использования модели: https://huggingface.co/pyannote/embedding

### 2. Настройте переменные окружения

```bash
# Скопируйте пример
cp .env.example .env

# Отредактируйте .env и добавьте ваш токен
HF_TOKEN=hf_ваш_токен_здесь
```

### 3. Запустите сервис

#### Docker Compose (рекомендуется)

```bash
docker-compose up -d
```

#### Прямой запуск

```bash
pip install -r requirements.txt
export HF_TOKEN=hf_ваш_токен_здесь
python app.py
```

### 4. Проверьте работу

```bash
# Проверка здоровья
curl http://localhost:7861/health

# Ожидаемый ответ:
# {"status":"healthy","pyannote_loaded":true}
```

## Что было исправлено

1. **Правильная инициализация pyannote** (app.py):
   ```python
   # Было (неправильно):
   embedder = Inference("pyannote/embedding", use_auth_token=token)
   
   # Стало (правильно):
   model = Model.from_pretrained("pyannote/embedding", use_auth_token=token)
   embedder = Inference(model, window="whole")
   ```

2. **Принудительное использование CPU**:
   ```python
   os.environ["CUDA_VISIBLE_DEVICES"] = ""
   torch.set_num_threads(1)
   ```

3. **Добавлена конфигурация**:
   - `.env` - переменные окружения
   - `docker-compose.yml` - Docker конфигурация
   - `.gitignore` - игнорирование секретов

## Интеграция с giga-am

В `services/giga-am/.env` установите:

```bash
SPEAKER_EMBEDDINGS_URL=http://localhost:7861
SPEAKER_EMBEDDINGS_TIMEOUT=60
```

Сервис автоматически будет использоваться для генерации эмбеддингов при диаризации.

## Troubleshooting

### Ошибка 401 Unauthorized

- Проверьте, что токен правильно установлен в `.env`
- Убедитесь, что приняли условия на https://huggingface.co/pyannote/embedding

### pyannote embedder unavailable

- Если токен не установлен, сервис будет работать в fallback режиме (только акустические признаки)
- Качество диаризации будет ниже, но сервис останется работоспособным

### CUDA errors

- Сервис настроен на использование только CPU
- Если видите CUDA ошибки, проверьте что `CUDA_VISIBLE_DEVICES=""` установлена
