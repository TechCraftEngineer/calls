import { callsService, usersService, workspacesService } from "@calls/db";
import { ReportEmail, sendEmail } from "@calls/emails";
import { formatTelegramReport, type ManagerStats } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const TZ = "Europe/Moscow";

const managerStatsSchema = z.object({
  name: z.string(),
  internalNumber: z.string().nullable(),
  incoming: z.object({ count: z.number(), duration: z.number() }),
  outgoing: z.object({ count: z.number(), duration: z.number() }),
  avgManagerScore: z.number().nullable().optional(),
  avgValueScore: z.number().nullable().optional(),
  evaluatedCount: z.number().optional(),
});

const statsSchema = z.record(z.string(), managerStatsSchema);

function parseInternalExtensions(ext: string | null): string[] | null {
  if (!ext || String(ext).trim().toLowerCase() === "all") return null;
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const sendTestEmail = workspaceProcedure.handler(async ({ context }) => {
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

  const internalNumbers = parseInternalExtensions(
    userForEdit.internalExtensions ?? null,
  );

  const { subDays } = await import("date-fns");
  const { formatInTimeZone } = await import("date-fns-tz");
  const now = new Date();
  const yesterday = subDays(now, 1);
  const dateFrom = formatInTimeZone(yesterday, TZ, "yyyy-MM-dd");
  const dateTo = dateFrom;
  const dateFromDb = `${dateFrom} 00:00:00`;
  const dateToDb = `${dateTo} 23:59:59`;

  const rawStats = await callsService.getEvaluationsStats({
    workspaceId,
    dateFrom: dateFromDb,
    dateTo: dateToDb,
    internalNumbers: internalNumbers ?? undefined,
  });

  const parseResult = statsSchema.safeParse(rawStats);
  if (!parseResult.success) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Некорректные данные статистики",
    });
  }
  const stats = parseResult.data as Record<string, ManagerStats>;

  const ws = await workspacesService.getById(workspaceId);
  const workspaceName = ws?.name ?? undefined;

  const text = formatTelegramReport({
    stats,
    dateFrom,
    dateTo,
    reportType: "daily",
    isManagerReport: false,
    workspaceName,
  });

  try {
    await sendEmail({
      to: [userEmail],
      subject: `Тестовый отчёт по звонкам: ${dateFrom}`,
      react: ReportEmail({
        reportText: text,
        reportType: "daily",
        username: userForEdit.givenName ?? undefined,
      }),
    });
    return { success: true };
  } catch (e) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message:
        e instanceof Error
          ? e.message
          : "Не удалось отправить email. Проверьте настройки Resend.",
    });
  }
});
