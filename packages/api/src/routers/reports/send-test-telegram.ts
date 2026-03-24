import {
  callsService,
  getInternalNumbersForUserIds,
  settingsService,
  usersService,
  workspacesService,
} from "@calls/db";
import { formatTelegramReportHtml, type ManagerStats } from "@calls/jobs";
import { sendMessage } from "@calls/telegram-bot";
import { ORPCError } from "@orpc/server";
import { subDays, subMonths, subWeeks } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const TZ = "Europe/Moscow";
const reportTypeSchema = z.object({
  reportType: z.enum(["daily", "weekly", "monthly"]),
});

function formatDateInMoscow(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

function getContextUserEmail(user: unknown): string {
  if (
    user &&
    typeof user === "object" &&
    "email" in user &&
    typeof user.email === "string" &&
    user.email.trim()
  ) {
    return user.email.trim();
  }

  throw new ORPCError("BAD_REQUEST", {
    message: "Email пользователя не найден в сессии",
  });
}

function getTelegramChatId(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  throw new ORPCError("BAD_REQUEST", {
    message: "Telegram Chat ID не указан. Подключите Telegram в настройках.",
  });
}

function parseInternalExtensions(ext: string | null): string[] | null {
  if (!ext || String(ext).trim().toLowerCase() === "all") return null;
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const sendTestTelegram = workspaceProcedure
  .input(reportTypeSchema)
  .handler(async ({ context, input }) => {
    const { workspaceId, workspaceRole } = context;
    if (!workspaceId)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const email = getContextUserEmail(context.user);
    const user = await usersService.getUserByEmail(email);
    if (!user)
      throw new ORPCError("NOT_FOUND", {
        message: "Пользователь не найден",
      });

    const chatId = getTelegramChatId(
      user && typeof user === "object" ? user.telegramChatId : undefined,
    );

    const { token } =
      await settingsService.getEffectiveTelegramBotToken(workspaceId);
    if (!token?.trim())
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Telegram-бот не настроен. Укажите токен бота в интеграциях или настройте системный TELEGRAM_BOT_TOKEN.",
      });

    const userForEdit = await usersService.getUserForEdit(user.id, workspaceId);
    if (!userForEdit)
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось загрузить настройки",
      });

    const isAdmin = workspaceRole === "admin" || workspaceRole === "owner";
    const isManagerReport =
      isAdmin && (userForEdit.telegramManagerReport ?? false);

    let internalNumbers: string[] | null = null;
    if (isManagerReport) {
      internalNumbers = await getInternalNumbersForUserIds(
        workspaceId,
        userForEdit.reportManagedUserIds ?? null,
      );
    } else {
      internalNumbers = parseInternalExtensions(
        userForEdit.internalExtensions ?? null,
      );
    }

    const { reportType } = input;
    const now = toZonedTime(new Date(), TZ);
    let dateFrom: string;
    let dateTo: string;

    if (reportType === "daily") {
      dateFrom = formatDateInMoscow(subDays(now, 1));
      dateTo = dateFrom;
    } else if (reportType === "weekly") {
      dateFrom = formatDateInMoscow(subWeeks(now, 1));
      dateTo = formatDateInMoscow(now);
    } else {
      dateFrom = formatDateInMoscow(subMonths(now, 1));
      dateTo = formatDateInMoscow(now);
    }
    const dateFromDb = `${dateFrom} 00:00:00`;
    const dateToDb = `${dateTo} 23:59:59`;

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

    const stats = await callsService.getEvaluationsStats({
      workspaceId,
      dateFrom: dateFromDb,
      dateTo: dateToDb,
      internalNumbers: internalNumbers ?? undefined,
      excludePhoneNumbers:
        excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    });

    let lowRatedCalls: Record<string, number> = {};
    if (isManagerReport) {
      lowRatedCalls = await callsService.getLowRatedCallsCount({
        workspaceId,
        dateFrom: dateFromDb,
        dateTo: dateToDb,
        internalNumbers: internalNumbers ?? undefined,
        excludePhoneNumbers:
          excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        maxScore: 3,
      });
    }

    const ws = await workspacesService.getById(workspaceId);
    const workspaceName = ws?.name ?? undefined;

    const text = formatTelegramReportHtml({
      stats: stats as Record<string, ManagerStats>,
      dateFrom,
      dateTo,
      reportType,
      isManagerReport,
      workspaceName,
      includeAvgRating: userForEdit.reportIncludeAvgRating ?? false,
      includeAvgValue: userForEdit.reportIncludeAvgValue ?? false,
      lowRatedCalls,
    });

    const success = await sendMessage(token, chatId, text, {
      parseMode: "HTML",
    });
    if (!success) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          "Не удалось отправить сообщение в Telegram. Проверьте настройки и подключение.",
      });
    }
    return { success: true };
  });
