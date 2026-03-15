/**
 * Утилиты для безопасного обновления промптов в UI
 */

export interface Prompt {
  key: string;
  value: string;
  description: string;
  updated_at?: string;
}

/**
 * Безопасно обновляет промпт в состоянии
 * @param prompts - текущее состояние промптов
 * @param key - ключ промпта
 * @param updates - обновляемые поля
 * @returns новое состояние промптов
 */
export function updatePromptSafe(
  prompts: Record<string, Prompt>,
  key: string,
  updates: Partial<Prompt>,
): Record<string, Prompt> {
  const updated = { ...prompts };

  // Создаем или обновляем промпт
  updated[key] = {
    ...(updated[key] || {
      key,
      value: "",
      description: "",
      updated_at: undefined,
    }),
    ...updates,
  };

  return updated;
}

/**
 * Безопасно обновляет значение промпта
 * @param prompts - текущее состояние промптов
 * @param key - ключ промпта
 * @param value - новое значение
 * @returns новое состояние промптов
 */
export function updatePromptValue(
  prompts: Record<string, Prompt>,
  key: string,
  value: string,
): Record<string, Prompt> {
  return updatePromptSafe(prompts, key, { value });
}

/**
 * Безопасно обновляет описание промпта
 * @param prompts - текущее состояние промптов
 * @param key - ключ промпта
 * @param description - новое описание
 * @returns новое состояние промптов
 */
export function updatePromptDescription(
  prompts: Record<string, Prompt>,
  key: string,
  description: string,
): Record<string, Prompt> {
  return updatePromptSafe(prompts, key, { description });
}

/**
 * Создает обработчик onChange для текстовых полей промптов
 * @param prompts - текущее состояние промптов
 * @param setPrompts - функция обновления состояния
 * @param key - ключ промпта
 * @param field - поле для обновления ('value' | 'description')
 * @returns обработчик onChange
 */
export function createPromptChangeHandler(
  prompts: Record<string, Prompt>,
  setPrompts: (prompts: Record<string, Prompt>) => void,
  key: string,
  field: "value" | "description" = "value",
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const updated = updatePromptSafe(prompts, key, { [field]: e.target.value });
    setPrompts(updated);
  };
}

export {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpUser,
} from "@calls/shared";
