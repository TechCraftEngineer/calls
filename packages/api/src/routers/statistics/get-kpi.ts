import {
  callsService,
  pbxService,
  settingsService,
  type WorkspacePbxEmployee,
  type WorkspacePbxNumber,
} from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

function parseInternalExtensions(s: string | null | undefined): string[] {
  if (!s || typeof s !== "string") return [];
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeInternalIdentifier(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length > 0) return digitsOnly;
  return trimmed.toLowerCase();
}

function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return (
    !Number.isNaN(date.getTime()) &&
    dateString.match(/^\d{4}-\d{2}-\d{2}$/) !== null
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calculateDaysInPeriod(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Включаем оба дня
}

type KpiStatsByInternalNumber = Awaited<
  ReturnType<typeof callsService.getKpiStats>
>[number];

export interface KpiRow {
  employeeExternalId: string;
  name: string;
  email: string;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  periodTargetTalkTimeMinutes: number;
  actualTalkTimeMinutes: number;
  kpiCompletionPercentage: number;
  calculatedBonus: number;
  totalCalculatedSalary: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
}

export function buildKpiRows(params: {
  startDate: string;
  endDate: string;
  pbxEmployees: WorkspacePbxEmployee[];
  pbxNumbers?: WorkspacePbxNumber[];
  kpiStats: KpiStatsByInternalNumber[];
}): KpiRow[] {
  const {
    startDate,
    endDate,
    pbxEmployees,
    pbxNumbers = [],
    kpiStats,
  } = params;
  const statsByInternal = new Map<string, KpiStatsByInternalNumber>();
  for (const stat of kpiStats) {
    const normalized = normalizeInternalIdentifier(stat.internalNumber);
    if (!normalized) continue;
    const prev = statsByInternal.get(normalized);
    if (prev) {
      prev.totalDurationSeconds += stat.totalDurationSeconds;
      prev.totalCalls += stat.totalCalls;
      prev.incoming += stat.incoming;
      prev.outgoing += stat.outgoing;
      prev.missed += stat.missed;
      continue;
    }
    statsByInternal.set(normalized, { ...stat });
  }

  const rows: KpiRow[] = [];
  const daysInPeriod = calculateDaysInPeriod(startDate, endDate);
  const start = new Date(startDate);
  const daysInMonth = getDaysInMonth(start.getFullYear(), start.getMonth());
  const employeeExtensionsByExternalId = new Map<string, Set<string>>();

  for (const employee of pbxEmployees) {
    const parsed = parseInternalExtensions(employee.extension)
      .map((ext) => normalizeInternalIdentifier(ext))
      .filter((ext): ext is string => Boolean(ext));
    employeeExtensionsByExternalId.set(employee.externalId, new Set(parsed));
  }

  for (const number of pbxNumbers) {
    if (!number.isActive || !number.employeeExternalId) continue;
    const parsedExtensions = parseInternalExtensions(number.extension)
      .map((ext) => normalizeInternalIdentifier(ext))
      .filter((ext): ext is string => Boolean(ext));
    const parsedPhoneNumber = normalizeInternalIdentifier(number.phoneNumber);
    if (parsedExtensions.length === 0 && !parsedPhoneNumber) continue;
    const existing =
      employeeExtensionsByExternalId.get(number.employeeExternalId) ??
      new Set<string>();
    for (const ext of parsedExtensions) {
      existing.add(ext);
    }
    if (parsedPhoneNumber) {
      existing.add(parsedPhoneNumber);
    }
    employeeExtensionsByExternalId.set(number.employeeExternalId, existing);
  }

  for (const employee of pbxEmployees) {
    if (!employee.isActive) continue;
    const baseSalary = employee.kpiBaseSalary ?? 0;
    const targetBonus = employee.kpiTargetBonus ?? 0;
    const targetTalkTime = employee.kpiTargetTalkTimeMinutes ?? 0;

    const extensions = Array.from(
      employeeExtensionsByExternalId.get(employee.externalId) ??
        new Set<string>(),
    );
    let actualTalkTime = 0;
    let totalCalls = 0;
    let incoming = 0;
    let outgoing = 0;
    let missed = 0;

    for (const ext of extensions) {
      const stat = statsByInternal.get(ext);
      if (stat) {
        actualTalkTime += stat.totalDurationSeconds / 60;
        totalCalls += stat.totalCalls;
        incoming += stat.incoming;
        outgoing += stat.outgoing;
        missed += stat.missed;
      }
    }

    const periodTarget =
      targetTalkTime > 0
        ? Math.round((targetTalkTime * daysInPeriod) / daysInMonth)
        : 0;

    const kpiCompletion =
      periodTarget > 0
        ? Math.min(100, Math.round((actualTalkTime / periodTarget) * 100))
        : 0;

    const calculatedBonus =
      targetBonus > 0 ? Math.round((targetBonus * kpiCompletion) / 100) : 0;

    const totalCalculatedSalary = baseSalary + calculatedBonus;

    const firstName = employee.firstName ?? "";
    const lastName = employee.lastName ?? "";
    const name =
      [firstName, lastName].filter(Boolean).join(" ") ||
      employee.displayName ||
      "—";
    const email = employee.email ?? "";

    rows.push({
      employeeExternalId: employee.externalId,
      name,
      email,
      baseSalary,
      targetBonus,
      targetTalkTimeMinutes: targetTalkTime,
      periodTargetTalkTimeMinutes: periodTarget,
      actualTalkTimeMinutes: Math.round(actualTalkTime),
      kpiCompletionPercentage: kpiCompletion,
      calculatedBonus,
      totalCalculatedSalary: totalCalculatedSalary,
      totalCalls,
      incoming,
      outgoing,
      missed,
    });
  }
  return rows;
}

export const getKpi = workspaceAdminProcedure
  .input(
    z
      .object({
        startDate: z.string().refine((date) => validateDate(date), {
          message: "Некорректный формат даты. Ожидается YYYY-MM-DD",
        }),
        endDate: z.string().refine((date) => validateDate(date), {
          message: "Некорректный формат даты. Ожидается YYYY-MM-DD",
        }),
      })
      .refine((data) => data.startDate <= data.endDate, {
        message: "Дата начала не может быть позже даты окончания",
      }),
  )
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const { startDate, endDate } = input;

    const dateFrom = `${startDate} 00:00:00`;
    const dateTo = `${endDate} 23:59:59`;

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

    const [pbxEmployees, pbxNumbers, kpiStats] = await Promise.all([
      pbxService.listEmployees(workspaceId),
      pbxService.listNumbers(workspaceId),
      callsService.getKpiStats({
        workspaceId,
        dateFrom,
        dateTo,
        excludePhoneNumbers:
          excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
      }),
    ]);
    return buildKpiRows({
      startDate,
      endDate,
      pbxEmployees,
      pbxNumbers,
      kpiStats,
    });
  });
