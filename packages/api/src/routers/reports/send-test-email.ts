import { callsService, usersService, workspacesService } from "@calls/db";
import { ReportEmail, sendEmail } from "@calls/emails";
import { formatTelegramReport, type ManagerStats } from "@calls/jobs";
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

export const sendTestEmail = workspaceProcedure.handler(async ({ context }) => {
  const { workspaceId } = context;
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

  const userEmail = (user as Record<string, unknown>).email as
    | string
    | undefined;
  if (!userEmail?.trim())
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

  const ws = await workspacesService.getById(workspaceId);
  const workspaceName = ws?.name ?? undefined;

  const text = formatTelegramReport({
    stats: stats as Record<string, ManagerStats>,
    dateFrom,
    dateTo,
    reportType: "daily",
    isManagerReport: false,
    workspaceName,
  });

  try {
    await sendEmail({
      to: [userEmail.trim()],
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
