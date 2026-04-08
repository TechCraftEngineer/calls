import { describe, expect, it } from "bun:test";

// Копии вспомогательных функций для тестирования
const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function parseTimeHHMM(s: string): { h: number; m: number } {
  const m = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(s?.trim() ?? "");
  if (!m) return { h: 18, m: 0 };
  return {
    h: parseInt(m[1] ?? "18", 10),
    m: parseInt(m[2] ?? "0", 10),
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  const safeLocal =
    local.length <= 2 ? (local[0] ?? "*") : `${local[0] ?? "*"}***${local.at(-1) ?? "*"}`;
  const [domName, domTld] = domain.split(".");
  if (!domName) return "***";
  const safeDomName =
    domName.length <= 2 ? (domName[0] ?? "*") : `${domName[0] ?? "*"}***${domName.at(-1) ?? "*"}`;
  return `${safeLocal}@${safeDomName}.${domTld ?? "***"}`;
}

function formatDateInMoscow(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastDayOfMonth(d: Date): number {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return next.getDate();
}

describe("parseTimeHHMM", () => {
  it("парсит время в формате HH:MM", () => {
    expect(parseTimeHHMM("14:30")).toEqual({ h: 14, m: 30 });
    expect(parseTimeHHMM("09:05")).toEqual({ h: 9, m: 5 });
    expect(parseTimeHHMM("23:59")).toEqual({ h: 23, m: 59 });
  });

  it("парсит время без ведущего нуля в часах", () => {
    expect(parseTimeHHMM("9:05")).toEqual({ h: 9, m: 5 });
    expect(parseTimeHHMM("1:00")).toEqual({ h: 1, m: 0 });
  });

  it("возвращает значение по умолчанию для невалидного формата", () => {
    expect(parseTimeHHMM("")).toEqual({ h: 18, m: 0 });
    expect(parseTimeHHMM("invalid")).toEqual({ h: 18, m: 0 });
    expect(parseTimeHHMM("25:00")).toEqual({ h: 18, m: 0 });
    expect(parseTimeHHMM("12:60")).toEqual({ h: 18, m: 0 });
  });

  it("обрабатывает пробелы", () => {
    expect(parseTimeHHMM("  14:30  ")).toEqual({ h: 14, m: 30 });
  });
});

describe("maskEmail", () => {
  it("маскирует email стандартного формата", () => {
    expect(maskEmail("ivan@example.com")).toBe("i***n@e***e.com");
    expect(maskEmail("test@gmail.com")).toBe("t***t@g***l.com");
  });

  it("обрабатывает короткие локальные части", () => {
    expect(maskEmail("ab@example.com")).toBe("a@e***e.com");
    expect(maskEmail("a@example.com")).toBe("a@e***e.com");
  });

  it("обрабатывает короткие домены", () => {
    expect(maskEmail("ivan@ab.com")).toBe("i***n@a.com");
    expect(maskEmail("ivan@a.io")).toBe("i***n@a.io");
  });

  it("возвращает *** для невалидных email", () => {
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("nodomain")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
  });

  it("обрабатывает поддомены", () => {
    expect(maskEmail("user@mail.example.com")).toBe("u***r@m***l.example");
  });
});

describe("formatDateInMoscow", () => {
  it("форматирует дату в формате YYYY-MM-DD", () => {
    expect(formatDateInMoscow(new Date("2026-01-15"))).toBe("2026-01-15");
    expect(formatDateInMoscow(new Date("2026-12-31"))).toBe("2026-12-31");
    expect(formatDateInMoscow(new Date("2026-05-05"))).toBe("2026-05-05");
  });

  it("добавляет ведущие нули", () => {
    expect(formatDateInMoscow(new Date("2026-01-01"))).toBe("2026-01-01");
    expect(formatDateInMoscow(new Date("2026-10-01"))).toBe("2026-10-01");
  });
});

describe("getLastDayOfMonth", () => {
  it("возвращает последний день месяца", () => {
    expect(getLastDayOfMonth(new Date("2026-01-15"))).toBe(31);
    expect(getLastDayOfMonth(new Date("2026-02-15"))).toBe(28); // Не високосный
    expect(getLastDayOfMonth(new Date("2026-04-15"))).toBe(30);
  });

  it("обрабатывает високосный год", () => {
    expect(getLastDayOfMonth(new Date("2024-02-15"))).toBe(29); // Високосный
  });

  it("обрабатывает декабрь", () => {
    expect(getLastDayOfMonth(new Date("2026-12-01"))).toBe(31);
  });
});

describe("WEEKDAY_MAP", () => {
  it("содержит правильные значения для дней недели", () => {
    expect(WEEKDAY_MAP.sun).toBe(0);
    expect(WEEKDAY_MAP.mon).toBe(1);
    expect(WEEKDAY_MAP.tue).toBe(2);
    expect(WEEKDAY_MAP.wed).toBe(3);
    expect(WEEKDAY_MAP.thu).toBe(4);
    expect(WEEKDAY_MAP.fri).toBe(5);
    expect(WEEKDAY_MAP.sat).toBe(6);
  });
});
