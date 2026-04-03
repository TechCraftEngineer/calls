import { describe, expect, it } from "bun:test";
import { z } from "zod";

// Тесты для валидации входных параметров
describe("getKpiDaily input validation", () => {
  const inputSchema = z
    .object({
      employeeExternalId: z.string().min(1, "employeeExternalId обязателен"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .refine((data) => data.startDate <= data.endDate, {
      message: "startDate должна быть <= endDate",
    })
    .refine(
      (data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const days = diffDays + 1;
        return days <= 90;
      },
      { message: "Период не может превышать 90 дней" },
    );

  it("должен принимать валидные входные данные", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "emp123",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });
    expect(result.success).toBe(true);
  });

  it("должен отклонять пустой employeeExternalId", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });
    expect(result.success).toBe(false);
  });

  it("должен отклонять некорректный формат даты", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "emp123",
      startDate: "2024/01/01",
      endDate: "2024-01-31",
    });
    expect(result.success).toBe(false);
  });

  it("должен отклонять startDate > endDate", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "emp123",
      startDate: "2024-02-01",
      endDate: "2024-01-31",
    });
    expect(result.success).toBe(false);
  });

  it("должен отклонять период > 90 дней", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "emp123",
      startDate: "2024-01-01",
      endDate: "2024-04-15",
    });
    expect(result.success).toBe(false);
  });

  it("должен принимать период ровно 90 дней", () => {
    const result = inputSchema.safeParse({
      employeeExternalId: "emp123",
      startDate: "2024-01-01",
      endDate: "2024-03-30",
    });
    expect(result.success).toBe(true);
  });
});

// Тесты для расчета дневных показателей
describe("getKpiDaily calculations", () => {
  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  it("должен правильно рассчитывать дневную цель", () => {
    const monthlyTarget = 6000; // 6000 минут в месяц
    const year = 2024;
    const month = 0; // Январь
    const daysInMonth = getDaysInMonth(year, month); // 31 день

    const dailyTarget = Math.round(monthlyTarget / daysInMonth);
    expect(dailyTarget).toBe(194); // 6000 / 31 ≈ 194
  });

  it("должен правильно рассчитывать процент выполнения", () => {
    const actualTime = 200;
    const targetTime = 194;

    const percentage = Math.min(100, Math.round((actualTime / targetTime) * 100));
    expect(percentage).toBe(100); // Ограничено 100%
  });

  it("должен правильно рассчитывать дневной бонус", () => {
    const monthlyBonus = 20000;
    const completionPercentage = 100;
    const daysInMonth = 31;

    const dailyBonus = Math.round((monthlyBonus * completionPercentage) / 100 / daysInMonth);
    expect(dailyBonus).toBe(645); // (20000 * 100 / 100) / 31 ≈ 645
  });

  it("должен возвращать 0 для бонуса при 0% выполнения", () => {
    const monthlyBonus = 20000;
    const completionPercentage = 0;
    const daysInMonth = 31;

    const dailyBonus = Math.round((monthlyBonus * completionPercentage) / 100 / daysInMonth);
    expect(dailyBonus).toBe(0);
  });

  it("должен правильно обрабатывать високосный год", () => {
    const year = 2024;
    const month = 1; // Февраль
    const daysInMonth = getDaysInMonth(year, month);
    expect(daysInMonth).toBe(29); // 2024 - високосный год
  });

  it("должен правильно обрабатывать невисокосный год", () => {
    const year = 2023;
    const month = 1; // Февраль
    const daysInMonth = getDaysInMonth(year, month);
    expect(daysInMonth).toBe(28); // 2023 - не високосный год
  });
});
