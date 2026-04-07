import { callsService, type ManagerStatsRow, settingsService, usersService, workspacesService } from "@calls/db";
import { type ManagerStats, ReportEmail, sendEmail } from "@calls/emails";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ORPCError } from "@orpc/server";
import { subDays, subMonths, subWeeks } from "date-fns";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const TZ = "Europe/Moscow";

function formatReportSubject(reportType: "daily" | "weekly" | "monthly", dateFrom: Date, dateTo: Date): string {
  const formatDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: ru });

  if (reportType === "daily") {
    const dayOfWeek = format(dateFrom, "EEEE", { locale: ru });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `Отчёт по звонкам за ${capitalizedDay} ${formatDate(dateFrom)}`;
  }

  const typeLabel = reportType === "weekly" ? "Еженедельный" : "Ежемесячный";
  return `Отчёт по звонкам (${typeLabel}): ${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
}
const reportTypeSchema = z.object({
  reportType: z.enum(["daily", "weekly", "monthly"]),
});

const managerStatsSchema = z.object({
  name: z.string(),
  internalNumber: z.string().nullable(),
  incoming: z.object({
    count: z.number(),
    duration: z.number(),
    totalDuration: z.number().optional(),
  }),
  outgoing: z.object({
    count: z.number(),
    duration: z.number(),
    totalDuration: z.number().optional(),
  }),
  avgManagerScore: z.number().nullable().optional(),
  evaluatedCount: z.number().optional(),
});

const statsSchema = z.record(z.string(), managerStatsSchema);
const REPORT_TYPE_LABELS = {
  daily: "Ежедневный",
  weekly: "Еженедельный",
  monthly: "Ежемесячный",
} as const satisfies Record<z.infer<typeof reportTypeSchema>["reportType"], string>;

function parseInternalExtensions(ext: string | null): string[] | null {
  if (!ext || String(ext).trim().toLowerCase() === "all") return null;
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const sendTestEmail = workspaceProcedure
  .input(reportTypeSchema)
  .handler(async ({ context, input }) => {
    const { workspaceId } = context;
    if (!workspaceId)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const email =
      context.sessionEmail?.trim() ??
      (context.user &&
      typeof context.user === "object" &&
      "email" in context.user &&
      typeof (context.user as { email?: unknown }).email === "string"
        ? (context.user as { email: string }).email.trim()
        : null);

    if (!email)
      throw new ORPCError("BAD_REQUEST", {
        message: "Email не указан. Укажите email в настройках.",
      });

    const user = await usersService.getUserByEmail(email);
    if (!user)
      throw new ORPCError("NOT_FOUND", {
        message: "Пользователь не найден",
      });

    const userEmail = user.email?.trim();
    if (!userEmail)
      throw new ORPCError("BAD_REQUEST", {
        message: "Email не указан. Укажите email в настройках.",
      });

    const userForEdit = await usersService.getUserForEdit(user.id, workspaceId);
    if (!userForEdit)
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось загрузить настройки",
      });

    const internalNumbers = parseInternalExtensions(userForEdit.internalExtensions ?? null);

    const { formatInTimeZone } = await import("date-fns-tz");
    const now = new Date();
    const { reportType } = input;
    const reportTypeLabel = REPORT_TYPE_LABELS[reportType];

    let dateFrom: Date;
    let dateTo: Date;
    let dateFromString: string;
    let dateToString: string;

    if (reportType === "daily") {
      const yesterday = subDays(now, 1);
      dateFrom = yesterday;
      dateTo = yesterday;
      dateFromString = formatInTimeZone(yesterday, TZ, "yyyy-MM-dd");
      dateToString = dateFromString;
    } else if (reportType === "weekly") {
      dateFrom = subWeeks(now, 1);
      dateTo = now;
      dateFromString = formatInTimeZone(dateFrom, TZ, "yyyy-MM-dd");
      dateToString = formatInTimeZone(dateTo, TZ, "yyyy-MM-dd");
    } else {
      dateFrom = subMonths(now, 1);
      dateTo = now;
      dateFromString = formatInTimeZone(dateFrom, TZ, "yyyy-MM-dd");
      dateToString = formatInTimeZone(dateTo, TZ, "yyyy-MM-dd");
    }
    const dateFromDb = `${dateFromString} 00:00:00`;
    const dateToDb = `${dateToString} 23:59:59`;

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

    const rawStats = await callsService.getEvaluationsStats({
      workspaceId,
      dateFrom: dateFromDb,
      dateTo: dateToDb,
      internalNumbers: internalNumbers ?? undefined,
      excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    });

    const parseResult = statsSchema.safeParse(rawStats);
    if (!parseResult.success) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Некорректные данные статистики",
      });
    }
    const stats = parseResult.data as Record<string, ManagerStatsRow>;
    const enrichedStats = (await callsService.enrichStatsWithKpi(stats, workspaceId, reportType)) as Record<
      string,
      ManagerStats
    >;

    // Определяем является ли пользователь админом для менеджерского отчета
    const isManagerReport = userForEdit.role === "owner" || userForEdit.role === "admin";

    // Получаем список звонков с низкой оценкой для менеджерских отчетов
    let lowRatedCalls: Record<string, number> = {};
    if (isManagerReport) {
      lowRatedCalls = await callsService.getLowRatedCallsCount({
        workspaceId,
        dateFrom: dateFromDb,
        dateTo: dateToDb,
        internalNumbers: internalNumbers ?? undefined,
        excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        maxScore: 3,
      });
    }

    // Получаем название workspace
    const ws = await workspacesService.getById(workspaceId);
    const workspaceName = ws?.name ?? undefined;

    try {
      const subject = formatReportSubject(reportType, dateFrom, dateTo);
      await sendEmail({
        to: [userEmail],
        subject,
        react: ReportEmail({
          reportType,
          username: userForEdit.givenName ?? undefined,
          stats: enrichedStats,
          includeKpi: true,
          avgManagerScore: true,
          dateFrom,
          dateTo,
          isManagerReport,
          lowRatedCalls,
          workspaceName,
        }),
      });
      return { success: true };
    } catch (e) {
      console.error("sendTestEmail failed", e);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отправить email. Проверьте настройки Resend.",
      });
    }
  });
