# Reports Module

## Рефакторинг от 1 апреля 2026

Был проведен рефакторинг большого файла `format-report.ts` (535 строк) в модульную структуру для улучшения поддерживаемости.

### 📁 Новая структура

```
src/reports/
├── index.ts                    # Главный экспорт всех функций
├── types.ts                    # Все типы и интерфейсы
├── utils.ts                    # Утилиты форматирования
├── stats-processor.ts          # Обработка статистики
├── telegram-formatter.ts       # Форматирование Telegram отчетов
├── html-formatter.ts           # Форматирование HTML отчетов
├── message-splitter.ts         # Разделение длинных сообщений
├── format-report.ts            # Обратная совместимость (реэкспорт)
└── README.md                   # Документация
```

### 🎯 Преимущества рефакторинга

1. **Модульность** - каждый файл отвечает за свою область
2. **Переиспользование** - утилиты и типы легко использовать в других местах
3. **Тестируемость** - каждый модуль можно тестировать отдельно
4. **Поддерживаемость** - легче находить и исправлять ошибки
5. **Читаемость** - маленькие файлы проще понимать

### 📦 Экспорты

#### Типы
```typescript
export type {
  ManagerStats,
  PreparedStats,
  FormatReportParams,
  StatsTotals,
  PreparedStatsResult,
} from "./types";
```

#### Основные функции
```typescript
export { formatTelegramReport } from "./telegram-formatter";
export { formatTelegramReportHtml } from "./html-formatter";
export { splitTelegramHtmlMessage } from "./message-splitter";
```

#### Утилиты
```typescript
export {
  formatValue,
  formatScore,
  escapeHtml,
  pluralizeCalls,
  getReportTypeLabel,
  validateReportParams,
} from "./utils";
```

#### Обработка статистики
```typescript
export {
  prepareStats,
  computeOverallAverages,
  calculateTotalMinutes,
  calculateManagerTotalMinutes,
} from "./stats-processor";
```

### 🔄 Обновленные импорты

Были обновлены файлы:
- `packages/jobs/src/index.ts` - теперь импортирует из `./reports`
- `packages/jobs/src/inngest/functions/telegram-reports.ts` - теперь импортирует из `../../reports`

### ✅ Обратная совместимость

Для сохранения обратной совместимости старый файл `format-report.ts` реэкспортирует все функции из новой модульной структуры. Существующий код продолжит работать без изменений.

### 📊 Статистика

- **Было:** 1 файл, 535 строк
- **Стало:** 8 файлов, ~80 строк каждый в среднем
- **Улучшение:** Разделение ответственности, лучшая тестируемость

### 🧪 Тестирование

Все модули успешно проходят:
- TypeScript компиляцию ✅
- Сборку проекта ✅  
- Обратную совместимость ✅
