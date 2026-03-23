import {
  callsService,
  pbxService,
  settingsService,
  usersService,
  type WorkspacePbxEmployee,
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

type PbxEmployeeLinkWithUser = Awaited<
  ReturnType<typeof pbxService.listLinks>
>[number];
type KpiStatsByInternalNumber = Awaited<
  ReturnType<typeof callsService.getKpiStats>
>[number];
type UserForEdit = NonNullable<
  Awaited<ReturnType<typeof usersService.getUserForEdit>>
>;

export interface KpiRow {
  userId: string;
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
  pbxLinks: PbxEmployeeLinkWithUser[];
  kpiStats: KpiStatsByInternalNumber[];
  userEditMap: Map<string, UserForEdit>;
}): KpiRow[] {
  const { startDate, endDate, pbxEmployees, pbxLinks, kpiStats, userEditMap } =
    params;
  const statsByInternal = new Map(kpiStats.map((s) => [s.internalNumber, s]));

  const employeeLinkMap = new Map<string, string>();
  for (const item of pbxLinks) {
    if (item.link.targetType !== "employee") continue;
    if (!item.link.targetExternalId || !item.user?.id) continue;
    employeeLinkMap.set(item.link.targetExternalId, item.user.id);
  }

  const rows: KpiRow[] = [];
  const daysInPeriod = calculateDaysInPeriod(startDate, endDate);
  const start = new Date(startDate);
  const daysInMonth = getDaysInMonth(start.getFullYear(), start.getMonth());

  for (const employee of pbxEmployees) {
    if (!employee.isActive) continue;

    const linkedUserId = employeeLinkMap.get(employee.externalId);
    const userForEdit = linkedUserId
      ? userEditMap.get(linkedUserId)
      : undefined;

    const baseSalary = userForEdit?.kpiBaseSalary ?? 0;
    const targetBonus = userForEdit?.kpiTargetBonus ?? 0;
    const targetTalkTime = userForEdit?.kpiTargetTalkTimeMinutes ?? 0;

    const extensions = parseInternalExtensions(employee.extension);
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
      userId: employee.externalId,
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
          message: "Некорректный формат даты. Ожиждается YYYY-MM-DD",
        }),
        endDate: z.string().refine((date) => validateDate(date), {
          message: "Некорректный формат даты. Ожиждается YYYY-MM-DD",
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

    const [pbxEmployees, pbxLinks, kpiStats] = await Promise.all([
      pbxService.listEmployees(workspaceId),
      pbxService.listLinks(workspaceId),
      callsService.getKpiStats({
        workspaceId,
        dateFrom,
        dateTo,
        excludePhoneNumbers:
          excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
      }),
    ]);

    const employeeLinkMap = new Map<string, string>();
    for (const item of pbxLinks) {
      if (item.link.targetType !== "employee") continue;
      if (!item.link.targetExternalId || !item.user?.id) continue;
      employeeLinkMap.set(item.link.targetExternalId, item.user.id);
    }
    const linkedUserIds = [...new Set(employeeLinkMap.values())];
    const linkedUsersForEdit = await Promise.all(
      linkedUserIds.map((userId) =>
        usersService.getUserForEdit(userId, workspaceId),
      ),
    );

    const userEditMap = new Map<
      string,
      NonNullable<(typeof linkedUsersForEdit)[number]>
    >();
    linkedUsersForEdit.forEach((userEdit, index) => {
      const userId = linkedUserIds[index];
      if (userEdit !== null && userId !== undefined) {
        userEditMap.set(userId, userEdit);
      }
    });

    return buildKpiRows({
      startDate,
      endDate,
      pbxEmployees,
      pbxLinks,
      kpiStats,
      userEditMap,
    });
  });
