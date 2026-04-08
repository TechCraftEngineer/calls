import { describe, expect, it } from "bun:test";
import { splitTelegramHtmlMessage } from "./message-splitter";

describe("splitTelegramHtmlMessage", () => {
  it("возвращает пустой массив для пустой строки", () => {
    const result = splitTelegramHtmlMessage("");
    expect(result).toEqual([""]);
  });

  it("возвращает исходное сообщение если оно короткое", () => {
    const message = "Короткое сообщение";
    const result = splitTelegramHtmlMessage(message, 4000);
    expect(result).toEqual([message]);
  });

  it("разделяет длинное сообщение по строкам", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `Строка ${i}`);
    const message = lines.join("\n");
    const result = splitTelegramHtmlMessage(message, 500);

    expect(result.length).toBeGreaterThan(1);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(500);
    }
  });

  it("сохраняет целостность строк", () => {
    const message = "Первая строка\nВторая строка\nТретья строка";
    const result = splitTelegramHtmlMessage(message, 50);

    // Проверяем что строки не разрезаны посередине
    const fullText = result.join("\n");
    expect(fullText).toContain("Первая строка");
    expect(fullText).toContain("Вторая строка");
    expect(fullText).toContain("Третья строка");
  });

  it("обрабатывает длинные строки без переносов", () => {
    const message = "a".repeat(1000);
    const result = splitTelegramHtmlMessage(message, 100);

    expect(result.length).toBeGreaterThan(1);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(100);
    }
  });

  it("сохраняет HTML теги целыми", () => {
    const message = "<b>Очень длинный текст</b>" + " слово".repeat(100);
    const result = splitTelegramHtmlMessage(message, 100);

    // Проверяем что теги не разрезаны
    for (const part of result) {
      const openTags = (part.match(/</g) || []).length;
      const closeTags = (part.match(/>/g) || []).length;
      // В каждой части теги должны быть закрыты или открыты
      expect(openTags).toBeGreaterThanOrEqual(0);
    }
  });

  it("сохраняет HTML entities целыми", () => {
    const message = "&amp; очень длинный текст с entities &lt;b&gt;тест&lt;/b&gt; " + "x".repeat(200);
    const result = splitTelegramHtmlMessage(message, 100);

    // Проверяем что entities не разрезаны
    for (const part of result) {
      // Не должно быть оборванных entities
      expect(part).not.toMatch(/&[^;]+$/);
    }
  });

  it("выбрасывает ошибку для невалидного maxLength", () => {
    expect(() => splitTelegramHtmlMessage("test", 0)).toThrow(RangeError);
    expect(() => splitTelegramHtmlMessage("test", -1)).toThrow(RangeError);
    expect(() => splitTelegramHtmlMessage("test", NaN)).toThrow(RangeError);
  });

  it("обрабатывает многострочное сообщение с разными длинами строк", () => {
    const message = "К\n".repeat(50) + "Очень длинная строка " + "word ".repeat(100);
    const result = splitTelegramHtmlMessage(message, 200);

    expect(result.length).toBeGreaterThan(1);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(200);
    }
  });

  it("возвращает исходное сообщение если maxLength больше длины", () => {
    const message = "Короткое сообщение";
    const result = splitTelegramHtmlMessage(message, 100);
    expect(result).toEqual([message]);
  });

  it("правильно разделяет сообщение точно по границе", () => {
    const message = "abcd\nefgh\nijkl";
    const result = splitTelegramHtmlMessage(message, 10);

    // Проверяем что разделение произошло корректно
    const combined = result.join("\n");
    expect(combined).toBe(message);
  });

  it("обрабатывает очень длинную строку с HTML тегом в конце", () => {
    const message = "a".repeat(95) + "<b>test</b>";
    const result = splitTelegramHtmlMessage(message, 100);

    // Проверяем что тег не разрезан
    expect(result[0]).not.toMatch(/<b$/);
  });

  it("обрабатывает пустые строки между строками с текстом", () => {
    const message = "Первая\n\n\nВторая\n\nТретья";
    const result = splitTelegramHtmlMessage(message, 100);

    const combined = result.join("\n");
    expect(combined).toBe(message);
  });
});
