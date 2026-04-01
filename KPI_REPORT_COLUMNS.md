# KPI колонки в отчетах

## Обновление от 1 апреля 2026

Добавлены новые колонки в email и telegram отчеты согласно требованиям:

### 📊 Новые колонки в отчетах

#### Основные колонки:
- **Звонки (количество)** - общее количество звонков менеджера
- **Минуты** - общее количество минут разговора

#### KPI колонки:
- **Оклад** - базовый оклад сотрудника (kpiBaseSalary)
- **Бонус** - рассчитанный бонус (kpiCalculatedBonus)
- **План минут** - целевой план по минутам (kpiTargetTalkTimeMinutes)
- **Факт выполнения** - факт выполнения в рублях (kpiActualPerformanceRubles)
- **% выполнения** - процент выполнения плана (kpiCompletionPercentage)
- **Итого** - общая сумма к выплате (kpiTotalSalary)

### 📈 Логика расчетов

1. **% выполнения плана:**
   ```
   completionPercentage = min(100, (actualMinutes / targetMinutes) * 100)
   ```

2. **Рассчитанный бонус:**
   ```
   calculatedBonus = targetBonus * (completionPercentage / 100)
   ```

3. **Факт выполнения в рублях:**
   ```
   actualPerformanceRubles = calculatedBonus
   ```

4. **Итого к выплате:**
   ```
   totalSalary = baseSalary + calculatedBonus
   ```

### 📧 Email отчеты

В HTML таблице добавлены колонки:
- Оклад
- Бонус  
- План минут
- Факт выполнения
- % выполнения
- Итого

### 📱 Telegram отчеты

В текстовом формате добавлены строки:
- 📊 План минут: X | 📈 Факт: Y ₽
- 📊 % выполнения: X% | 💵 Итого: Y ₽

### 🔄 Обновленные файлы

1. **packages/emails/emails/report.tsx**
   - Добавлены новые колонки в таблицу
   - Обновлены интерфейсы ManagerStats и PreparedStats
   - Добавлено поле kpiActualPerformanceRubles

2. **packages/jobs/src/reports/format-report.ts**
   - Добавлены новые поля в текстовые отчеты
   - Обновлены интерфейсы ManagerStats и PreparedStats
   - Добавлено поле kpiActualPerformanceRubles

3. **packages/db/src/repositories/calls/enrich-stats.ts**
   - Добавлено поле kpiActualPerformanceRubles в EnrichedManagerStats
   - Добавлена логика расчета факта выполнения в рублях

### ✅ Проверка

Все изменения проходят проверку типов:
- `packages/emails` - ✅ 
- `packages/db` - ✅
- `packages/jobs` - есть ошибки в других пакетах (asr), но не в измененных файлах

### 🎯 Результат

Теперь отчеты содержат все запрошенные колонки:
- Звонки (кол-во) ✅
- Минуты ✅  
- Оклад ✅
- Бонус в рублях ✅
- План по минутам ✅
- Факт выполнения в рублях ✅
- В процентах ✅
- Итоговая сумма ✅
