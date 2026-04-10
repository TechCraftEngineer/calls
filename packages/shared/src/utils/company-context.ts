/**
 * Shared utilities for the calls application
 */

/**
 * Формирует контекст компании из данных workspace для использования в AI промптах.
 *
 * @param workspace - Объект workspace с полями name и description
 * @returns Отформатированная строка с контекстом компании или undefined если данных нет
 *
 * @warning Возвращаемая строка может содержать неочищенный пользовательский контент.
 * НЕ является безопасной/экранированной. ДОЛЖНА быть провалидирована и/или очищена
 * вызывающим кодом перед встраиванием в AI промпты или недоверенные выводы.
 *
 * @example
 * ```ts
 * // НЕБЕЗОПАСНОЕ использование:
 * const context = buildCompanyContext(workspace);
 * aiPrompt += context; // Опасно - может содержать инъекции
 *
 * // БЕЗОПАСНОЕ использование:
 * const rawContext = buildCompanyContext(workspace);
 * const safeContext = companyContextSchema.parse(rawContext); // Валидация
 * aiPrompt += safeContext; // Безопасно
 * ```
 *
 * @see companyContextSchema - схема валидации для безопасного использования
 */
export function buildCompanyContext(workspace: {
  name?: string | null;
  description?: string | null;
}): string | undefined {
  const parts: string[] = [];
  const companyName = workspace.name?.trim();
  const companyDescription = workspace.description?.trim();

  if (companyName) {
    parts.push(`Название компании: ${companyName}`);
  }
  if (companyDescription) {
    parts.push(`Описание компании: ${companyDescription}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}
