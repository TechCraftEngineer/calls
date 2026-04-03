/** Unit tests for KPI utility functions. */

import { describe, expect, it } from "bun:test";
import {
  calculateCompletionPercentage,
  calculateDailyTarget,
  calculateDaysInMonth,
  formatCurrency,
  formatDateISO,
  getColorByPercentage,
} from "./kpi-utils";

describe("calculateDaysInMonth", () => {
  it("should return 31 days for January", () => {
    expect(calculateDaysInMonth(2024, 1)).toBe(31);
  });

  it("should return 28 days for February in non-leap year", () => {
    expect(calculateDaysInMonth(2023, 2)).toBe(28);
  });

  it("should return 29 days for February in leap year", () => {
    expect(calculateDaysInMonth(2024, 2)).toBe(29);
  });

  it("should return 30 days for April", () => {
    expect(calculateDaysInMonth(2024, 4)).toBe(30);
  });
});

describe("calculateDailyTarget", () => {
  it("should calculate daily target correctly for 30-day month", () => {
    const monthlyTarget = 6000; // 6000 minutes per month
    const dailyTarget = calculateDailyTarget(monthlyTarget, 2024, 4); // April has 30 days
    expect(dailyTarget).toBe(200); // 6000 / 30 = 200
  });

  it("should calculate daily target correctly for 31-day month", () => {
    const monthlyTarget = 6200; // 6200 minutes per month
    const dailyTarget = calculateDailyTarget(monthlyTarget, 2024, 1); // January has 31 days
    expect(dailyTarget).toBe(200); // 6200 / 31 = 200
  });

  it("should round daily target to nearest integer", () => {
    const monthlyTarget = 6000;
    const dailyTarget = calculateDailyTarget(monthlyTarget, 2024, 2); // February 2024 has 29 days
    expect(dailyTarget).toBe(207); // 6000 / 29 = 206.896... rounds to 207
  });

  it("should handle zero monthly target", () => {
    expect(calculateDailyTarget(0, 2024, 1)).toBe(0);
  });
});

describe("calculateCompletionPercentage", () => {
  it("should return 100 when actual equals target", () => {
    expect(calculateCompletionPercentage(200, 200)).toBe(100);
  });

  it("should return 50 when actual is half of target", () => {
    expect(calculateCompletionPercentage(100, 200)).toBe(50);
  });

  it("should cap at 100 when actual exceeds target", () => {
    expect(calculateCompletionPercentage(250, 200)).toBe(100);
  });

  it("should return 0 when actual is 0", () => {
    expect(calculateCompletionPercentage(0, 200)).toBe(0);
  });

  it("should return 0 when target is 0", () => {
    expect(calculateCompletionPercentage(100, 0)).toBe(0);
  });

  it("should return 0 when target is negative", () => {
    expect(calculateCompletionPercentage(100, -50)).toBe(0);
  });

  it("should round percentage to nearest integer", () => {
    expect(calculateCompletionPercentage(166, 200)).toBe(83); // 166/200 = 0.83 = 83%
  });
});

describe("formatCurrency", () => {
  it("should format currency with space separator and ruble symbol", () => {
    const result = formatCurrency(10000);
    expect(result).toContain("10");
    expect(result).toContain("000");
    expect(result).toContain("₽");
  });

  it("should format small numbers correctly", () => {
    expect(formatCurrency(500)).toBe("500 ₽");
  });

  it("should format large numbers with multiple separators", () => {
    const result = formatCurrency(1234567);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
    expect(result).toContain("₽");
  });

  it("should handle zero", () => {
    expect(formatCurrency(0)).toBe("0 ₽");
  });

  it("should handle negative numbers", () => {
    const result = formatCurrency(-5000);
    expect(result).toContain("-5");
    expect(result).toContain("000");
    expect(result).toContain("₽");
  });
});

describe("formatDateISO", () => {
  it("should format Date object to YYYY-MM-DD", () => {
    const date = new Date("2024-01-15T10:30:00");
    expect(formatDateISO(date)).toBe("2024-01-15");
  });

  it("should format date string to YYYY-MM-DD", () => {
    expect(formatDateISO("2024-01-15")).toBe("2024-01-15");
  });

  it("should pad single-digit month and day with zeros", () => {
    const date = new Date("2024-03-05T10:30:00");
    expect(formatDateISO(date)).toBe("2024-03-05");
  });

  it("should handle end of year", () => {
    const date = new Date("2024-12-31T23:59:59");
    expect(formatDateISO(date)).toBe("2024-12-31");
  });
});

describe("getColorByPercentage", () => {
  it("should return green for 100%", () => {
    expect(getColorByPercentage(100)).toBe("green");
  });

  it("should return green for percentage above 100", () => {
    expect(getColorByPercentage(150)).toBe("green");
  });

  it("should return yellow for 80%", () => {
    expect(getColorByPercentage(80)).toBe("yellow");
  });

  it("should return yellow for percentage between 80 and 99", () => {
    expect(getColorByPercentage(90)).toBe("yellow");
  });

  it("should return red for percentage below 80", () => {
    expect(getColorByPercentage(79)).toBe("red");
  });

  it("should return red for 0%", () => {
    expect(getColorByPercentage(0)).toBe("red");
  });

  it("should return red for negative percentage", () => {
    expect(getColorByPercentage(-10)).toBe("red");
  });
});
