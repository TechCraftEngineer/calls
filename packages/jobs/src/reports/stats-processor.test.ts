import { describe, expect, it } from "bun:test";
import {
  calculateMinutesFromSeconds,
  computeOverallAverages,
  prepareStats,
} from "./stats-processor";
import type { ManagerStats } from "./types";

describe("calculateMinutesFromSeconds", () => {
  it("правильно конвертирует секунды в минуты", () => {
    expect(calculateMinutesFromSeconds(60)).toBe(1);
    expect(calculateMinutesFromSeconds(120)).toBe(2);
    expect(calculateMinutesFromSeconds(0)).toBe(0);
  });

  it("округляет до ближайшей минуты", () => {
    expect(calculateMinutesFromSeconds(90)).toBe(2); // 1.5 мин → 2
    expect(calculateMinutesFromSeconds(89)).toBe(1); // 1.48 мин → 1
    expect(calculateMinutesFromSeconds(91)).toBe(2); // 1.52 мин → 2
  });
});

describe("prepareStats", () => {
  it("подготавливает статистику одного менеджера", () => {
    const entries: [string, ManagerStats][] = [
      [
        "Иван",
        {
          name: "Иван",
          internalNumber: "101",
          incoming: { count: 10, duration: 60 }, // 60 сек средняя длительность
          outgoing: { count: 5, duration: 30 }, // 30 сек средняя длительность
          avgManagerScore: 4.5,
          evaluatedCount: 15,
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers).toHaveLength(1);
    const firstManager = result.managers[0];
    expect(firstManager).toBeDefined();
    expect(firstManager?.name).toBe("Иван");
    expect(firstManager?.incomingCount).toBe(10);
    expect(firstManager?.outgoingCount).toBe(5);
    expect(firstManager?.totalCount).toBe(15);
    expect(firstManager?.incomingMinutes).toBe(10); // 10 * 60 сек = 600 сек = 10 мин
    expect(firstManager?.outgoingMinutes).toBe(3); // 5 * 30 сек = 150 сек ≈ 3 мин (округление)
    expect(firstManager?.avgManagerScore).toBe(4.5);
    expect(firstManager?.evaluatedCount).toBe(15);
    expect(result.totals.totalCount).toBe(15);
  });

  it("подготавливает статистику нескольких менеджеров", () => {
    const entries: [string, ManagerStats][] = [
      [
        "Иван",
        {
          name: "Иван",
          internalNumber: "101",
          incoming: { count: 10, duration: 600 },
          outgoing: { count: 5, duration: 300 },
        },
      ],
      [
        "Петр",
        {
          name: "Петр",
          internalNumber: "102",
          incoming: { count: 8, duration: 480 },
          outgoing: { count: 12, duration: 720 },
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers).toHaveLength(2);
    expect(result.totals.incomingCount).toBe(18);
    expect(result.totals.outgoingCount).toBe(17);
    expect(result.totals.totalCount).toBe(35);
  });

  it("сортирует менеджеров по количеству звонков", () => {
    const entries: [string, ManagerStats][] = [
      [
        "А",
        {
          name: "А",
          internalNumber: "101",
          incoming: { count: 5, duration: 300 },
          outgoing: { count: 0, duration: 0 },
        },
      ],
      [
        "Б",
        {
          name: "Б",
          internalNumber: "102",
          incoming: { count: 10, duration: 600 },
          outgoing: { count: 0, duration: 0 },
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers[0]?.name).toBe("Б");
    expect(result.managers[1]?.name).toBe("А");
  });

  it("использует totalDuration если доступен", () => {
    const entries: [string, ManagerStats][] = [
      [
        "Иван",
        {
          name: "Иван",
          internalNumber: "101",
          incoming: { count: 2, duration: 60, totalDuration: 300 },
          outgoing: { count: 0, duration: 0 },
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers[0]?.incomingTotalDurationSec).toBe(300);
    expect(result.managers[0]?.incomingMinutes).toBe(5);
  });

  it("обрабатывает null internalNumber", () => {
    const entries: [string, ManagerStats][] = [
      [
        "Иван",
        {
          name: "Иван",
          internalNumber: null,
          incoming: { count: 0, duration: 0 },
          outgoing: { count: 0, duration: 0 },
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers).toHaveLength(1);
    expect(result.managers[0]?.name).toBe("Иван");
  });

  it("обрабатывает KPI данные", () => {
    const entries: [string, ManagerStats][] = [
      [
        "Иван",
        {
          name: "Иван",
          internalNumber: "101",
          incoming: { count: 10, duration: 600 },
          outgoing: { count: 5, duration: 300 },
          kpiBaseSalary: 50000,
          kpiTargetBonus: 10000,
          kpiTargetTalkTimeMinutes: 120,
          kpiActualTalkTimeMinutes: 100,
          kpiCompletionPercentage: 83.3,
          kpiCalculatedBonus: 8330,
          kpiTotalSalary: 58330,
          kpiActualPerformanceRubles: 8330,
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers[0]?.kpiBaseSalary).toBe(50000);
    expect(result.managers[0]?.kpiCalculatedBonus).toBe(8330);
    expect(result.totals.totalBaseSalary).toBe(50000);
    expect(result.totals.totalCalculatedBonus).toBe(8330);
    expect(result.totals.totalKpiTargetTalkTimeMinutes).toBe(120);
    expect(result.totals.totalKpiActualTalkTimeMinutes).toBe(100);
  });

  it("пропускает невалидные записи", () => {
    const entries: [string, ManagerStats][] = [
      ["Иван", null as unknown as ManagerStats],
      [
        "Петр",
        {
          name: "Петр",
          internalNumber: "102",
          incoming: { count: 5, duration: 300 },
          outgoing: { count: 0, duration: 0 },
        },
      ],
    ];

    const result = prepareStats(entries);

    expect(result.managers).toHaveLength(1);
    expect(result.managers[0]?.name).toBe("Петр");
  });
});

describe("computeOverallAverages", () => {
  it("вычисляет среднюю оценку менеджеров", () => {
    const managers = [
      {
        name: "Иван",
        incomingCount: 10,
        outgoingCount: 5,
        totalCount: 15,
        incomingAvgDurationSec: 60,
        outgoingAvgDurationSec: 60,
        incomingTotalDurationSec: 600,
        outgoingTotalDurationSec: 300,
        incomingMinutes: 10,
        outgoingMinutes: 5,
        avgManagerScore: 4.5,
        evaluatedCount: 10,
      },
      {
        name: "Петр",
        incomingCount: 8,
        outgoingCount: 2,
        totalCount: 10,
        incomingAvgDurationSec: 60,
        outgoingAvgDurationSec: 60,
        incomingTotalDurationSec: 480,
        outgoingTotalDurationSec: 120,
        incomingMinutes: 8,
        outgoingMinutes: 2,
        avgManagerScore: 3.5,
        evaluatedCount: 5,
      },
    ];

    const result = computeOverallAverages(managers);

    // Взвешенная средняя: (4.5*10 + 3.5*5) / 15 = (45 + 17.5) / 15 = 4.17
    expect(result.avgManagerScore).toBeCloseTo(4.17, 1);
  });

  it("возвращает null если нет оценок", () => {
    const managers = [
      {
        name: "Иван",
        incomingCount: 10,
        outgoingCount: 5,
        totalCount: 15,
        incomingAvgDurationSec: 60,
        outgoingAvgDurationSec: 60,
        incomingTotalDurationSec: 600,
        outgoingTotalDurationSec: 300,
        incomingMinutes: 10,
        outgoingMinutes: 5,
        avgManagerScore: null,
        evaluatedCount: 0,
      },
    ];

    const result = computeOverallAverages(managers);

    expect(result.avgManagerScore).toBeNull();
  });

  it("обрабатывает менеджеров без оценок", () => {
    const managers = [
      {
        name: "Иван",
        incomingCount: 10,
        outgoingCount: 5,
        totalCount: 15,
        incomingAvgDurationSec: 60,
        outgoingAvgDurationSec: 60,
        incomingTotalDurationSec: 600,
        outgoingTotalDurationSec: 300,
        incomingMinutes: 10,
        outgoingMinutes: 5,
        avgManagerScore: 4.0,
        evaluatedCount: 5,
      },
      {
        name: "Петр",
        incomingCount: 8,
        outgoingCount: 2,
        totalCount: 10,
        incomingAvgDurationSec: 60,
        outgoingAvgDurationSec: 60,
        incomingTotalDurationSec: 480,
        outgoingTotalDurationSec: 120,
        incomingMinutes: 8,
        outgoingMinutes: 2,
        avgManagerScore: null,
        evaluatedCount: 0,
      },
    ];

    const result = computeOverallAverages(managers);

    // Только Иван имеет оценки
    expect(result.avgManagerScore).toBe(4.0);
  });

  it("возвращает null для пустого массива", () => {
    const result = computeOverallAverages([]);
    expect(result.avgManagerScore).toBeNull();
  });
});
