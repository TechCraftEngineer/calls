import { callsService, settingsService, usersService, workspacesService } from "@calls/db";
import { formatTelegramReportHtml } from "@calls/jobs";
import { formatDateInMoscow, nowInMoscow } from "@calls/shared";
import { sendMessage } from "@calls/telegram-bot";
import { ORPCError } from "@orpc/server";
import { subMonths, subWeeks } from "date-fns";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

const TZ = "Europe/Moscow";

const reportTypeSchema = z.object({
  reportType: z.enum(["daily", "weekly", "monthly"]),
});

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

export const sendTestTelegram = workspaceProcedure
  .input(reportTypeSchema)
  .handler(async ({ context, input }) => {
    const { workspaceId, workspaceRole } = context;
    if (!workspaceId)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const userForEdit = await usersService.getUserForEdit(context.user.id as string, workspaceId);
    if (!userForEdit)
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось загрузить настройки",
      });

    const chatId = getTelegramChatId(
      userForEdit && typeof userForEdit === "object" ? userForEdit.telegramChatId : undefined,
    );

    const { token } = await settingsService.getEffectiveTelegramBotToken(workspaceId);
    if (!token?.trim())
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Telegram-бот не настроен. Укажите токен бота в интеграциях или настройте системный TELEGRAM_BOT_TOKEN.",
      });
    const isAdmin = workspaceRole === "admin" || workspaceRole === "owner";
    const isManagerReport = isAdmin && (userForEdit.telegramManagerReport ?? false);

    const { reportType } = input;
    const now = nowInMoscow();
    let dateFrom: Date;
    let dateTo: Date;
    let dateFromString: string;
    let dateToString: string;

    if (reportType === "daily") {
      dateFrom = now;
      dateTo = now;
      dateFromString = formatDateInMoscow(now);
      dateToString = dateFromString;
    } else if (reportType === "weekly") {
      dateFrom = subWeeks(now, 1);
      dateTo = now;
      dateFromString = formatDateInMoscow(dateFrom);
      dateToString = formatDateInMoscow(dateTo);
    } else {
      dateFrom = subMonths(now, 1);
      dateTo = now;
      dateFromString = formatDateInMoscow(dateFrom);
      dateToString = formatDateInMoscow(dateTo);
    }
    const dateFromDb = `${dateFromString} 00:00:00`;
    const dateToDb = `${dateToString} 23:59:59`;

    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];

    const stats = await callsService.getEvaluationsStats({
      workspaceId,
      dateFrom: dateFromDb,
      dateTo: dateToDb,
      excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    });

    const enrichedStats = await callsService.enrichStatsWithKpi(stats, workspaceId, reportType);

    let lowRatedCalls: Record<string, number> = {};
    if (isManagerReport) {
      lowRatedCalls = await callsService.getLowRatedCallsCount({
        workspaceId,
        dateFrom: dateFromDb,
        dateTo: dateToDb,
        excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
        maxScore: 3,
      });
    }

    const ws = await workspacesService.getById(workspaceId);
    const workspaceName = ws?.name ?? undefined;

    const text = formatTelegramReportHtml({
      stats: enrichedStats,
      dateFrom,
      dateTo,
      reportType,
      isManagerReport,
      workspaceName,
      lowRatedCalls,
    });

    const success = await sendMessage(token, chatId, text, {
      parseMode: "HTML",
    });
    if (!success) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отправить сообщение в Telegram. Проверьте настройки и подключение.",
      });
    }
    return { success: true };
  });
