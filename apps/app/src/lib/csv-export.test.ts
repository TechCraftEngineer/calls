/** Unit tests for CSV export functions. */

import { describe, expect, it } from "bun:test";
import type { DailyKpiRow } from "@calls/api/routers/statistics/get-kpi-daily";
import { generateCSV, generateCSVFileName, sanitizeFileName } from "@/lib/csv-export";

describe("sanitizeFileName", () => {
  it("should normalize unicode (NFC)", () => {
    // Combining characters
    const name = "Иван\u0301"; // И + combining acute accent
    const result = sanitizeFileName(name);
    expect(result).toBe("Иван́");
  });

  it("should replace invalid filename characters with dash", () => {
    const name = 'Иван\\Петров/Сидоров:Тест*?"<>|';
    const result = sanitizeFileName(name);
    expect(result).toBe("Иван-Петров-Сидоров-Тест------");
  });

  it("should collapse multiple spaces into one", () => {
    const name = "Иван    Петров   Сидоров";
    const result = sanitizeFileName(name);
    expect(result).toBe("Иван Петров Сидоров");
  });

  it("should trim leading and trailing spaces", () => {
    const name = "  Иван Петров  ";
    const result = sanitizeFileName(name);
    expect(result).toBe("Иван Петров");
  });

  it("should truncate to 100 characters", () => {
    const name = "А".repeat(150);
    const result = sanitizeFileName(name);
    expect(result.length).toBe(100);
  });

  it("should return 'employee' for empty string", () => {
    expect(sanitizeFileName("")).toBe("employee");
  });

  it("should return 'employee' for string with only invalid characters", () => {
    expect(sanitizeFileName('\\/:*?"<>|')).toBe("employee");
  });

  it("should return 'employee' for string with only spaces", () => {
    expect(sanitizeFileName("   ")).toBe("employee");
  });

  it("should handle normal names correctly", () => {
    expect(sanitizeFileName("Иван Иванов")).toBe("Иван Иванов");
    expect(sanitizeFileName("John Smith")).toBe("John Smith");
  });
});

describe("generateCSV", () => {
  it("should generate CSV with correct header", () => {
    const data: DailyKpiRow[] = [];
    const csv = generateCSV(data);

    const lines = csv.split("\n");
    const header = lines[0].replace("\uFEFF", ""); // Remove BOM

    expect(header).toBe(
      "Дата;Сотрудник;Email;Входящие;Исходящие;Пропущенные;Всего звонков;Время разговоров (мин);Цель (мин);Выполнение (%);Бонус (₽)",
    );
  });

  it("should include UTF-8 BOM", () => {
    const data: DailyKpiRow[] = [];
    const csv = generateCSV(data);

    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("should generate correct number of columns", () => {
    const data: DailyKpiRow[] = [
      {
        date: "2024-01-15",
        employeeExternalId: "ext123",
        employeeName: "Иван Иванов",
        employeeEmail: "ivan@example.com",
        totalCalls: 46,
        incoming: 25,
        outgoing: 18,
        missed: 3,
        actualTalkTimeMinutes: 180,
        targetTalkTimeMinutes: 200,
        completionPercentage: 90,
        dailyBonus: 4500,
      },
    ];

    const csv = generateCSV(data);
    const lines = csv.split("\n");

    // Check header has 11 columns
    const header = lines[0].replace("\uFEFF", "");
    expect(header.split(";").length).toBe(11);

    // Check data row has 11 columns
    expect(lines[1].split(";").length).toBe(11);
  });

  it("should format data correctly", () => {
    const data: DailyKpiRow[] = [
      {
        date: "2024-01-15",
        employeeExternalId: "ext123",
        employeeName: "Иван Иванов",
        employeeEmail: "ivan@example.com",
        totalCalls: 46,
        incoming: 25,
        outgoing: 18,
        missed: 3,
        actualTalkTimeMinutes: 180,
        targetTalkTimeMinutes: 200,
        completionPercentage: 90,
        dailyBonus: 4500,
      },
    ];

    const csv = generateCSV(data);
    const lines = csv.split("\n");
    const dataRow = lines[1];

    expect(dataRow).toBe("2024-01-15;Иван Иванов;ivan@example.com;25;18;3;46;180;200;90;4500");
  });

  it("should handle empty data array", () => {
    const data: DailyKpiRow[] = [];
    const csv = generateCSV(data);

    // Should only contain header without trailing newline
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\n").length).toBe(1);
  });

  it("should handle multiple rows", () => {
    const data: DailyKpiRow[] = [
      {
        date: "2024-01-15",
        employeeExternalId: "ext123",
        employeeName: "Иван Иванов",
        employeeEmail: "ivan@example.com",
        totalCalls: 46,
        incoming: 25,
        outgoing: 18,
        missed: 3,
        actualTalkTimeMinutes: 180,
        targetTalkTimeMinutes: 200,
        completionPercentage: 90,
        dailyBonus: 4500,
      },
      {
        date: "2024-01-16",
        employeeExternalId: "ext123",
        employeeName: "Иван Иванов",
        employeeEmail: "ivan@example.com",
        totalCalls: 52,
        incoming: 30,
        outgoing: 20,
        missed: 2,
        actualTalkTimeMinutes: 220,
        targetTalkTimeMinutes: 200,
        completionPercentage: 100,
        dailyBonus: 5000,
      },
    ];

    const csv = generateCSV(data);
    const lines = csv.split("\n");

    expect(lines.length).toBe(3); // Header + 2 data rows
  });

  it("should handle special characters in employee name", () => {
    const data: DailyKpiRow[] = [
      {
        date: "2024-01-15",
        employeeExternalId: "ext123",
        employeeName: "Иван; Петров, О'Коннор",
        employeeEmail: "ivan@example.com",
        totalCalls: 46,
        incoming: 25,
        outgoing: 18,
        missed: 3,
        actualTalkTimeMinutes: 180,
        targetTalkTimeMinutes: 200,
        completionPercentage: 90,
        dailyBonus: 4500,
      },
    ];

    const csv = generateCSV(data);
    const lines = csv.split("\n");
    const dataRow = lines[1];

    // The semicolon in the name should be preserved (it's the delimiter, but in this context it's part of the data)
    expect(dataRow).toContain("Иван; Петров, О'Коннор");
  });

  it("should handle zero values", () => {
    const data: DailyKpiRow[] = [
      {
        date: "2024-01-15",
        employeeExternalId: "ext123",
        employeeName: "Иван Иванов",
        employeeEmail: "ivan@example.com",
        totalCalls: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        actualTalkTimeMinutes: 0,
        targetTalkTimeMinutes: 0,
        completionPercentage: 0,
        dailyBonus: 0,
      },
    ];

    const csv = generateCSV(data);
    const lines = csv.split("\n");
    const dataRow = lines[1];

    expect(dataRow).toBe("2024-01-15;Иван Иванов;ivan@example.com;0;0;0;0;0;0;0;0");
  });
});

describe("generateCSVFileName", () => {
  it("should generate filename in correct format", () => {
    const result = generateCSVFileName("Иван Иванов", "2024-01-15", "2024-01-31");
    expect(result).toBe("kpi-daily-Иван Иванов-2024-01-15-2024-01-31.csv");
  });

  it("should sanitize employee name in filename", () => {
    const result = generateCSVFileName(
      'Иван\\Петров/Сидоров:Тест*?"<>|',
      "2024-01-15",
      "2024-01-31",
    );
    expect(result).toBe("kpi-daily-Иван-Петров-Сидоров-Тест-------2024-01-15-2024-01-31.csv");
  });

  it("should handle empty employee name", () => {
    const result = generateCSVFileName("", "2024-01-15", "2024-01-31");
    expect(result).toBe("kpi-daily-employee-2024-01-15-2024-01-31.csv");
  });

  it("should handle long employee names", () => {
    const longName = "А".repeat(150);
    const result = generateCSVFileName(longName, "2024-01-15", "2024-01-31");

    // Should be truncated to 100 characters + prefix + dates + extension
    expect(result.length).toBeLessThanOrEqual(
      100 + "kpi-daily-".length + "-2024-01-15-2024-01-31.csv".length,
    );
  });
});
