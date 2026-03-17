import {
  callsService,
  getInternalNumbersForUserIds,
  settingsService,
  usersService,
  workspacesService,
} from "@calls/db";
import { formatTelegramReport, type ManagerStats } from "@calls/jobs";
import { sendMessage } from "@calls/telegram-bot";
import { ORPCError } from "@orpc/server";
import { workspaceProcedure } from "../../orpc";

const TZ = "Europe/Moscow";

function formatDateInMoscow(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInternalExtensions(ext: string | null): string[] | null {
  if (!ext || String(ext).trim().toLowerCase() === "all") return null;
  return ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const sendTestTelegram = workspaceProcedure.handler(
  async ({ context }) => {
    const { workspaceId, workspaceRole } = context;
    if (!workspaceId)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const email = (context.user as Record<string, unknown>).email as string;
    const user = await usersService.getUserByEmail(email);
    if (!user)
      throw new ORPCError("NOT_FOUND", {
        message: "Пользователь не найден",
      });

    const chatId = (user as Record<string, unknown>).telegramChatId as
      | string
      | undefined;
    if (!chatId?.trim())
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Telegram Chat ID не указан. Подключите Telegram в настройках.",
      });

    const token = await settingsService.getDecryptedBotToken(
      "telegram_bot_token",
      workspaceId,
    );
    if (!token?.trim())
      throw new ORPCError("BAD_REQUEST", {
        message: "Telegram Bot Token не настроен. Укажите токен в Настройках.",
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

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateFrom = formatDateInMoscow(yesterday);
    const dateTo = dateFrom;
    const dateFromDb = `${dateFrom} 00:00:00`;
    const dateToDb = `${dateTo} 23:59:59`;

    const stats = await callsService.getEvaluationsStats({
      workspaceId,
      dateFrom: dateFromDb,
      dateTo: dateToDb,
      internalNumbers: internalNumbers ?? undefined,
    });

    let lowRatedCalls: Record<string, number> = {};
    if (isManagerReport) {
      lowRatedCalls = await callsService.getLowRatedCallsCount({
        workspaceId,
        dateFrom: dateFromDb,
        dateTo: dateToDb,
        internalNumbers: internalNumbers ?? undefined,
        maxScore: 3,
      });
    }

    const ws = await workspacesService.getById(workspaceId);
    const workspaceName = ws?.name ?? undefined;

    const text = formatTelegramReport({
      stats: stats as Record<string, ManagerStats>,
      dateFrom,
      dateTo,
      reportType: "daily",
      isManagerReport,
      workspaceName,
      includeAvgRating: userForEdit.reportIncludeAvgRating ?? false,
      includeAvgValue: userForEdit.reportIncludeAvgValue ?? false,
      lowRatedCalls,
    });

    const success = await sendMessage(token, chatId.trim(), text);
    if (!success) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          "Не удалось отправить сообщение в Telegram. Проверьте настройки и подключение.",
      });
    }
    return { success: true };
  },
);
