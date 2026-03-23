import { describe, expect, it } from "bun:test";
import { buildKpiRows } from "./get-kpi";

describe("buildKpiRows", () => {
  it("строит KPI по pbx_employees, а не по users", () => {
    const rows = buildKpiRows({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      pbxEmployees: [
        {
          externalId: "emp-1",
          extension: "101",
          email: "emp1@company.com",
          firstName: "Иван",
          lastName: "Петров",
          displayName: "Иван Петров",
          isActive: true,
        },
      ] as unknown as Parameters<typeof buildKpiRows>[0]["pbxEmployees"],
      kpiStats: [
        {
          internalNumber: "101",
          totalDurationSeconds: 3600,
          totalCalls: 10,
          incoming: 6,
          outgoing: 3,
          missed: 1,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        employeeExternalId: "emp-1",
        name: "Иван Петров",
        email: "emp1@company.com",
        actualTalkTimeMinutes: 60,
        totalCalls: 10,
        incoming: 6,
        outgoing: 3,
        missed: 1,
        baseSalary: 0,
        targetBonus: 0,
        targetTalkTimeMinutes: 0,
        periodTargetTalkTimeMinutes: 0,
        kpiCompletionPercentage: 0,
        calculatedBonus: 0,
        totalCalculatedSalary: 0,
      }),
    );
  });

  it("использует KPI-настройки из pbx employee без привязки к user", () => {
    const rows = buildKpiRows({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      pbxEmployees: [
        {
          externalId: "emp-linked",
          extension: "201",
          email: "linked@company.com",
          firstName: "Анна",
          lastName: "Иванова",
          displayName: "Анна Иванова",
          kpiBaseSalary: 50000,
          kpiTargetBonus: 20000,
          kpiTargetTalkTimeMinutes: 180,
          isActive: true,
        },
        {
          externalId: "emp-unlinked",
          extension: "202",
          email: "unlinked@company.com",
          firstName: null,
          lastName: null,
          displayName: "Без привязки",
          kpiBaseSalary: 0,
          kpiTargetBonus: 0,
          kpiTargetTalkTimeMinutes: 0,
          isActive: true,
        },
      ] as unknown as Parameters<typeof buildKpiRows>[0]["pbxEmployees"],
      kpiStats: [
        {
          internalNumber: "201",
          totalDurationSeconds: 11160,
          totalCalls: 12,
          incoming: 7,
          outgoing: 4,
          missed: 1,
        },
        {
          internalNumber: "202",
          totalDurationSeconds: 1800,
          totalCalls: 5,
          incoming: 3,
          outgoing: 1,
          missed: 1,
        },
      ],
    });

    expect(rows).toHaveLength(2);

    const linked = rows.find((row) => row.employeeExternalId === "emp-linked");
    const unlinked = rows.find(
      (row) => row.employeeExternalId === "emp-unlinked",
    );

    expect(linked).toEqual(
      expect.objectContaining({
        actualTalkTimeMinutes: 186,
        periodTargetTalkTimeMinutes: 180,
        kpiCompletionPercentage: 100,
        calculatedBonus: 20000,
        totalCalculatedSalary: 70000,
      }),
    );

    expect(unlinked).toEqual(
      expect.objectContaining({
        baseSalary: 0,
        targetBonus: 0,
        targetTalkTimeMinutes: 0,
        periodTargetTalkTimeMinutes: 0,
        kpiCompletionPercentage: 0,
        calculatedBonus: 0,
        totalCalculatedSalary: 0,
      }),
    );
  });

  it("суммирует статистику по нескольким extension одного pbx employee", () => {
    const rows = buildKpiRows({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      pbxEmployees: [
        {
          externalId: "emp-multi-ext",
          extension: "301, 302;303",
          email: "multi@company.com",
          firstName: "Мульти",
          lastName: "Линия",
          displayName: "Мульти Линия",
          isActive: true,
        },
      ] as unknown as Parameters<typeof buildKpiRows>[0]["pbxEmployees"],
      kpiStats: [
        {
          internalNumber: "301",
          totalDurationSeconds: 1200,
          totalCalls: 2,
          incoming: 1,
          outgoing: 1,
          missed: 0,
        },
        {
          internalNumber: "302",
          totalDurationSeconds: 600,
          totalCalls: 1,
          incoming: 1,
          outgoing: 0,
          missed: 0,
        },
        {
          internalNumber: "303",
          totalDurationSeconds: 180,
          totalCalls: 1,
          incoming: 0,
          outgoing: 1,
          missed: 0,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        actualTalkTimeMinutes: 33,
        totalCalls: 4,
        incoming: 2,
        outgoing: 2,
        missed: 0,
      }),
    );
  });

  it("сопоставляет extension и internal_number в разных форматах", () => {
    const rows = buildKpiRows({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      pbxEmployees: [
        {
          externalId: "emp-format-match",
          extension: "SIP/101, admin",
          email: "fmt@company.com",
          firstName: "Формат",
          lastName: "Тест",
          displayName: "Формат Тест",
          isActive: true,
        },
      ] as unknown as Parameters<typeof buildKpiRows>[0]["pbxEmployees"],
      kpiStats: [
        {
          internalNumber: "101",
          totalDurationSeconds: 600,
          totalCalls: 2,
          incoming: 1,
          outgoing: 1,
          missed: 0,
        },
        {
          internalNumber: "ADMIN",
          totalDurationSeconds: 300,
          totalCalls: 1,
          incoming: 1,
          outgoing: 0,
          missed: 0,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        actualTalkTimeMinutes: 15,
        totalCalls: 3,
        incoming: 2,
        outgoing: 1,
        missed: 0,
      }),
    );
  });

  it("берет extension из pbx numbers, если у сотрудника extension пустой", () => {
    const rows = buildKpiRows({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      pbxEmployees: [
        {
          externalId: "emp-by-number",
          extension: null,
          email: "num@company.com",
          firstName: "По",
          lastName: "Номеру",
          displayName: "По Номеру",
          isActive: true,
        },
      ] as unknown as Parameters<typeof buildKpiRows>[0]["pbxEmployees"],
      pbxNumbers: [
        {
          employeeExternalId: "emp-by-number",
          extension: "404",
          isActive: true,
        },
      ] as unknown as NonNullable<
        Parameters<typeof buildKpiRows>[0]["pbxNumbers"]
      >,
      kpiStats: [
        {
          internalNumber: "404",
          totalDurationSeconds: 900,
          totalCalls: 3,
          incoming: 2,
          outgoing: 1,
          missed: 0,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        actualTalkTimeMinutes: 15,
        totalCalls: 3,
        incoming: 2,
        outgoing: 1,
        missed: 0,
      }),
    );
  });
});
