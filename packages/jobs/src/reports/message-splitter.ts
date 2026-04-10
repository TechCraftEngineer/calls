/**
 * Разделение длинных сообщений для Telegram
 */

export function splitTelegramHtmlMessage(message: string, maxLength = 4000): string[] {
  if (!message) return [""];
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    throw new RangeError("maxLength должен быть положительным числом");
  }
  if (message.length <= maxLength) return [message];

  const parts: string[] = [];
  const lines = message.split("\n");
  let current = "";

  const pushCurrent = () => {
    if (current.length > 0) {
      parts.push(current);
      current = "";
    }
  };

  for (const line of lines) {
    const candidate = current.length > 0 ? `${current}\n${line}` : line;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    pushCurrent();
    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    const findSafeEnd = (text: string, start: number, intendedEnd: number) => {
      if (intendedEnd >= text.length) return intendedEnd;
      const chunk = text.slice(start, intendedEnd);

      // Проверяем наличие незакрытого HTML тега
      const lastOpenTag = chunk.lastIndexOf("<");
      const lastCloseTag = chunk.lastIndexOf(">");
      if (lastOpenTag > lastCloseTag) {
        // Сканируем вперед от intendedEnd для поиска закрывающего '>'
        const searchStart = intendedEnd;
        const maxSearch = Math.min(searchStart + 100, text.length); // Ограничение для избежания бесконечного роста
        for (let i = searchStart; i < maxSearch; i++) {
          if (text[i] === ">") {
            return i + 1; // Возвращаем индекс после '>'
          }
        }
      }

      // Проверяем наличие незакрытой HTML entity
      const lastOpenEntity = chunk.lastIndexOf("&");
      const lastCloseEntity = chunk.lastIndexOf(";");
      if (lastOpenEntity > lastCloseEntity) {
        // Сканируем вперед от intendedEnd для поиска закрывающего ';'
        const searchStart = intendedEnd;
        const maxSearch = Math.min(searchStart + 20, text.length); // Ограничение для entities
        for (let i = searchStart; i < maxSearch; i++) {
          if (text[i] === ";") {
            return i + 1; // Возвращаем индекс после ';'
          }
        }
      }

      return intendedEnd;
    };

    let start = 0;
    while (start < line.length) {
      const intendedEnd = Math.min(start + maxLength, line.length);
      let end = findSafeEnd(line, start, intendedEnd);

      if (end <= start) {
        end = Math.min(start + maxLength, line.length);
      }

      parts.push(line.slice(start, end));
      start = end;
    }
  }

  pushCurrent();
  return parts.length > 0 ? parts : [message.slice(0, maxLength)];
}
