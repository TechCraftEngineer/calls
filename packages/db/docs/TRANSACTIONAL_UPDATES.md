# Примеры использования улучшенных методов сохранения звонков

## Транзакционные обновления

### 1. Атомарное обновление записи звонка и файла

```typescript
import { callsService } from '@calls/db';

// Вместо последовательных обновлений:
await callsService.updateCallRecording('550e8400-e29b-41d4-a716-446655440000', { fileId: '550e8400-e29b-41d4-a716-446655440001' });
await callsService.updateEnhancedAudio('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002');
await callsService.updateCustomerName('550e8400-e29b-41d4-a716-446655440000', 'Иван Иванов');

// Используем один транзакционный метод:
await callsService.updateCallWithRecording('550e8400-e29b-41d4-a716-446655440000', {
  fileId: '550e8400-e29b-41d4-a716-446655440001',
  enhancedAudioFileId: '550e8400-e29b-41d4-a716-446655440002',
  customerName: 'Иван Иванов'
});
```

### 2. Атомарное обновление PBX привязки и имени клиента

```typescript
// Вместо последовательных обновлений:
await callsService.updateCallPbxBinding('550e8400-e29b-41d4-a716-446655440000', {
  internalNumber: '123',
  source: 'megapbx',
  name: 'Менеджер'
});
await callsService.updateCustomerName('550e8400-e29b-41d4-a716-446655440000', 'Клиент');

// Используем один транзакционный метод:
await callsService.updateCallPbxBindingWithCustomer('550e8400-e29b-41d4-a716-446655440000', {
  internalNumber: '123',
  source: 'megapbx', 
  name: 'Менеджер',
  customerName: 'Клиент'
});
```

## Валидация данных с Zod

### Автоматическая валидация

Все методы теперь включают автоматическую валидацию через Zod схемы:

```typescript
import { callsService, ValidationError } from '@calls/db';

try {
  await callsService.createCall({
    workspaceId: 'ws_123456',
    filename: 'recording.mp3',
    internalNumber: '123',           // Проверка: только цифры
    number: '+7 (999) 123-45-67',    // Проверка: валидный телефон
    direction: 'inbound',            // Проверка: inbound/outbound
    provider: 'megapbx',             // Проверка: max 50 символов
    externalId: 'ext-123',           // Проверка: max 100 символов
    customerName: 'Иван Иванов',     // Проверка: max 200 символов
    name: 'Менеджер',               // Проверка: max 100 символов
    source: 'megapbx',               // Проверка: max 50 символов
    timestamp: '2024-01-01T10:00:00Z'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Ошибки валидации:', error.message);
    console.error('Детали:', error.issues);
    
    // Примеры ошибок:
    // - "Validation errors: internalNumber должен содержать только цифры; number должен быть валидным номером телефона"
    // - "Validation errors: direction должен быть 'inbound' или 'outbound'"
  } else {
    console.error('Другая ошибка:', error.message);
  }
}
```

### Zod схемы

Все схемы определены в `validation/call-schemas.ts`:

```typescript
import { 
  createCallSchema,
  updateCustomerNameSchema,
  updateRecordingSchema,
  updateEnhancedAudioSchema,
  updatePbxBindingSchema,
  updateWithRecordingSchema,
  updatePbxBindingWithCustomerSchema,
  validateWithSchema,
  ValidationError
} from '@calls/db/validation/call-schemas';

// Прямая валидация
try {
  const validData = validateWithSchema(createCallSchema, inputData);
  console.log('Данные валидны:', validData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Ошибки:', error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    })));
  }
}
```

### Валидация UUID

```typescript
try {
  await callsService.updateCallRecording('invalid-uuid-format', { fileId: null });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message); // "Validation errors: callId должен быть валидным UUID"
  }
}

try {
  await callsService.updateCallRecording('550e8400-e29b-41d4-a716-446655440000', { 
    fileId: 'invalid-uuid-format' 
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message); // "Validation errors: fileId должен быть валидным UUID"
  }
}
```

## Обработка ошибок и логирование

### Автоматическое логирование

Все методы автоматически логируют ошибки в activity log:

```typescript
// При ошибке создания звонка:
await callsService.createCall(invalidData);
// Автоматически добавится в activity log:
// "Failed to create call from file recording.mp3: Validation errors: internalNumber должен содержать только цифры"

// При ошибке обновления:
await callsService.updateCallRecording(callId, { fileId: invalidFileId });
// Автоматически добавится в activity log:
// "Failed to update recording for call {callId}: Validation errors: fileId должен быть валидным UUID"
```

### Успешное логирование для транзакций

```typescript
await callsService.updateCallWithRecording('550e8400-e29b-41d4-a716-446655440000', {
  fileId: '550e8400-e29b-41d4-a716-446655440001',
  enhancedAudioFileId: '550e8400-e29b-41d4-a716-446655440002'
});
// Автоматически добавится в activity log:
// "Call 550e8400-e29b-41d4-a716-446655440000 updated with recording data (fileId: 550e8400-e29b-41d4-a716-446655440001, enhancedAudio: 550e8400-e29b-41d4-a716-446655440002)"
```

## Преимущества Zod валидации

### 1. Структурированные ошибки

```typescript
// Раньше: простые строки
throw new Error('internalNumber должен содержать только цифры');

// Теперь: детализированные ошибки с путями
{
  issues: [
    {
      code: 'invalid_string',
      path: ['internalNumber'],
      message: 'Внутренний номер должен содержать только цифры'
    },
    {
      code: 'invalid_string', 
      path: ['number'],
      message: 'Номер телефона должен быть валидным'
    }
  ]
}
```

### 2. Автоматическое приведение типов

```typescript
// Zod автоматически приводит и очищает данные
const result = createCallSchema.parse(rawData);
// result имеет правильный тип CreateCallInput
// Все nullable поля правильно обработаны
// Все строки обрезаны и нормализованы
```

### 3. Композиция схем

```typescript
// Схемы можно комбинировать
const updateSchema = updateRecordingSchema.and(updateEnhancedAudioSchema);

// Или расширять
const extendedSchema = createCallSchema.extend({
  additionalField: z.string().optional()
});
```

## Рекомендации по использованию

### 1. Используйте транзакционные методы для связанных обновлений

```typescript
// ✅ Хорошо - атомарно с валидацией
await callsService.updateCallWithRecording(callId, {
  fileId: fileUuid,
  enhancedAudioFileId: enhancedUuid,
  customerName: customerName
});

// ❌ Плохо - не атомарно, дублируется валидация
await callsService.updateCallRecording(callId, { fileId: fileUuid });
await callsService.updateEnhancedAudio(callId, enhancedUuid);
await callsService.updateCustomerName(callId, customerName);
```

### 2. Обрабатывайте ValidationError отдельно

```typescript
try {
  await callsService.createCall(callData);
} catch (error) {
  if (error instanceof ValidationError) {
    // Показать пользователю детальные ошибки валидации
    const fieldErrors = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    showValidationErrors(fieldErrors);
  } else {
    // Другие ошибки - логировать и показывать общую ошибку
    logger.error('Unexpected error:', error);
    showGenericError('Произошла ошибка при сохранении звонка');
  }
}
```

### 3. Валидация на клиенте

```typescript
import { createCallSchema } from '@calls/db/validation/call-schemas';

// Клиентская валидация для лучшего UX
function validateCallData(data: unknown): string[] {
  const result = createCallSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues.map(issue => issue.message);
  }
  return [];
}

// Использование в React форме
const errors = validateCallData(formData);
setErrors(errors);
