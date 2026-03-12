# 📋 План рефакторинга именования файлов

## 🎯 Цель
Привести структуру файлов к современным best practices для улучшения читаемости, масштабируемости и поддержки кода.

## 📊 Текущее состояние анализа

### Компоненты (components/) - PascalCase ❌
```
AudioPlayer.tsx → audio-player.tsx ✅
AudioPlayerModal.tsx → audio-player-modal.tsx ✅
AuthProvider.tsx → auth-provider.tsx ✅
CallDetailModal.tsx → call-detail-modal.tsx ✅
CallList.tsx → call-list.tsx ✅
ChatWidget.tsx → chat-widget.tsx ✅
CustomDropdown.tsx → custom-dropdown.tsx ✅
Header.tsx → header.tsx ✅
KpiTable.tsx → kpi-table.tsx ✅
Metrics.tsx → metrics.tsx ✅
Navbar.tsx → navbar.tsx ✅
RecommendationsModal.tsx → recommendations-modal.tsx ✅
ReportSettingsFormBody.tsx → report-settings-form-body.tsx ✅
ReportSettingsPanel.tsx → report-settings-panel.tsx ✅
Sidebar.tsx → sidebar.tsx ✅
TailwindShowcase.tsx → tailwind-showcase.tsx ✅
UserForm.tsx → user-form.tsx ✅
```

### Утилиты (lib/) - camelCase ❌
```
api-orpc.ts → api-orpc.ts ✅ (kebab-case уже)
api.ts → api.ts ✅ (одно слово)
auth.ts → auth.ts ✅ (одно слово)
better-auth.ts → better-auth.ts ✅ (kebab-case уже)
chat.ts → chat.ts ✅ (одно слово)
hooks.ts → hooks.ts ✅ (одно слово)
orpc.ts → orpc.ts ✅ (одно слово)
utils.ts → utils.ts ✅ (одно слово)
validations.ts → validations.ts ✅ (одно слово)
```

### App файлы - смешанные ❌
```
globals-tailwind.css → globals-tailwind.css ✅
globals.css → globals.css ✅
layout.tsx → layout.tsx ✅
page.tsx → page.tsx ✅
```

## 🔄 Правила именования

### ✅ Правильные подходы
1. **Компоненты React**: `kebab-case.tsx`
2. **Утилиты/сервисы**: `kebab-case.ts`
3. **Типы/интерфейсы**: `kebab-case.ts`
4. **CSS файлы**: `kebab-case.css`
5. **Config файлы**: `kebab-case.config.ts`
6. **Pages**: `page.tsx`, `layout.tsx` (Next.js конвенция)

### ❌ Неправильные подходы
1. **PascalCase для файлов**: `ComponentName.tsx`
2. **camelCase для файлов**: `fileName.ts`
3. **Смешанные стили**: `Component_name.tsx`

## 🚀 План рефакторинга

### Этап 1: Компоненты (Высокий приоритет)
- [ ] AudioPlayer.tsx → audio-player.tsx
- [ ] AudioPlayerModal.tsx → audio-player-modal.tsx
- [ ] AuthProvider.tsx → auth-provider.tsx
- [ ] CallDetailModal.tsx → call-detail-modal.tsx
- [ ] CallList.tsx → call-list.tsx
- [ ] ChatWidget.tsx → chat-widget.tsx
- [ ] CustomDropdown.tsx → custom-dropdown.tsx
- [ ] Header.tsx → header.tsx
- [ ] KpiTable.tsx → kpi-table.tsx
- [ ] Metrics.tsx → metrics.tsx
- [ ] Navbar.tsx → navbar.tsx
- [ ] RecommendationsModal.tsx → recommendations-modal.tsx
- [ ] ReportSettingsFormBody.tsx → report-settings-form-body.tsx
- [ ] ReportSettingsPanel.tsx → report-settings-panel.tsx
- [ ] Sidebar.tsx → sidebar.tsx
- [ ] TailwindShowcase.tsx → tailwind-showcase.tsx
- [ ] UserForm.tsx → user-form.tsx

### Этап 2: Обновление импортов (Критический приоритет)
- [ ] Обновить все импорты в компонентах
- [ ] Обновить импорты в app файлах
- [ ] Обновить импорты в lib файлах
- [ ] Проверить импорты в тестах

### Этап 3: Проверка сборки (Высокий приоритет)
- [ ] Запустить `bun run build`
- [ ] Исправить ошибки импортов
- [ ] Проверить TypeScript типы

### Этап 4: Документация (Низкий приоритет)
- [ ] Обновить README.md
- [ ] Создать гайд по именованию файлов
- [ ] Обновить архитектурную документацию

## 📝 Примеры изменений

### До:
```typescript
// components/CallList.tsx
import AudioPlayer from './AudioPlayer';
import { Header } from './Header';
```

### После:
```typescript
// components/call-list.tsx
import { AudioPlayer } from './audio-player';
import { Header } from './header';
```

## 🎯 Преимущества рефакторинга

1. **Читаемость**: Легче сканировать файлы в проводнике
2. **Консистентность**: Единый стиль именования
3. **Поиск**: Удобнее искать файлы по имени
4. **Автодополнение**: Лучше работает в IDE
5. **Scalability**: Легче добавлять новые файлы

## 🔧 Инструменты для автоматизации

### VS Code
- **Find and Replace**: Глобальный поиск и замена импортов
- **Rename File**: Автоматическое обновление импортов

### Скрипты
```bash
# Найти все импорты PascalCase
grep -r "from './[A-Z]" apps/frontend/

# Заменить импорты (пример)
find apps/frontend -name "*.tsx" -exec sed -i 's|from '\''./AudioPlayer'\''|from '\''./audio-player'\''|g' {} \;
```

## ⚠️ Риски и митигация

1. **Сборка**: Возможны ошибки импортов
   - ✅ Митигация: Постепенная замена с проверкой сборки
2. **Git history**: Много изменений в файлах
   - ✅ Митигация: Использовать `git mv` для сохранения истории
3. **CI/CD**: Возможны проблемы в пайплайнах
   - ✅ Митигация: Тестирование в dev окружении

## 📋 Checklist завершения

- [ ] Все компоненты переименованы в kebab-case
- [ ] Все импорты обновлены
- [ ] Сборка проходит без ошибок
- [ ] TypeScript проверяет типы
- [ ] Тесты проходят (если есть)
- [ ] Документация обновлена
- [ ] Code review пройден

---

**Статус**: 🔄 В процессе
**Приоритет**: Высокий
**Ожидаемое время**: 2-3 часа
