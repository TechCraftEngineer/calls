/**
 * REST маршруты для звонков: транскрипция, переоценка.
 */

import { type AuthLike, createBackendContext, createLogger } from "@calls/api";
import { callsService } from "@calls/db";
import { inngest } from "@calls/jobs";
import { Hono } from "hono";

const logger = createLogger("calls-routes");

export function createCallsRoutes(auth: AuthLike) {
  const app = new Hono();

  app.post("/api/calls/:id/transcribe", async (c) => {
    try {
      const callId = c.req.param("id");
      const model = c.req.query("model") ?? "assemblyai";

      if (!callId) {
        return c.json({ detail: "ID звонка обязателен" }, 400);
      }

      const context = await createBackendContext({
        headers: c.req.raw.headers,
        auth,
      });

      if (!context.user || !context.workspaceId) {
        return c.json(
          { detail: "Требуется авторизация и активный workspace" },
          401,
        );
      }

      const call = await callsService.getCall(callId);
      if (!call) {
        return c.json({ detail: "Звонок не найден" }, 404);
      }
      if (call.workspaceId !== context.workspaceId) {
        return c.json({ detail: "Нет доступа к этому звонку" }, 403);
      }

      await inngest.send({
        name: "call/transcribe.requested",
        data: { callId, model },
      });

      logger.info("Транскрипция поставлена в очередь", { callId, model });
      return c.json({ success: true, message: "Транскрипция запущена" });
    } catch (error) {
      logger.error("Ошибка при постановке транскрипции в очередь", {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ detail: "Не удалось запустить транскрипцию" }, 500);
    }
  });

  app.post("/api/calls/:id/evaluate", async (c) => {
    try {
      const callId = c.req.param("id");

      if (!callId) {
        return c.json({ detail: "ID звонка обязателен" }, 400);
      }

      const context = await createBackendContext({
        headers: c.req.raw.headers,
        auth,
      });

      if (!context.user || !context.workspaceId) {
        return c.json(
          { detail: "Требуется авторизация и активный workspace" },
          401,
        );
      }

      const call = await callsService.getCall(callId);
      if (!call) {
        return c.json({ detail: "Звонок не найден" }, 404);
      }
      if (call.workspaceId !== context.workspaceId) {
        return c.json({ detail: "Нет доступа к этому звонку" }, 403);
      }

      // TODO: Реализовать Inngest-функцию call/evaluate.requested
      return c.json({ detail: "Переоценка звонка пока не реализована" }, 501);
    } catch (error) {
      logger.error("Ошибка при запросе переоценки", {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ detail: "Внутренняя ошибка сервера" }, 500);
    }
  });

  return app;
}
