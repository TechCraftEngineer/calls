/**
 * Прокси записи звонка: браузер запрашивает с origin приложения (cookie-сессия),
 * сервер тянет объект из S3 по presigned URL. Так обходится CORS при fetch/WebAudio
 * (wavesurfer.js, Web Audio), на который не влияют заголовки бакета.
 */
import { createBackendContext } from "@calls/api/orpc";
import { filesService } from "@calls/db";
import { getDownloadUrl } from "@calls/lib";
import type { Hono } from "hono";
import { auth } from "../auth";

export function registerCallPlaybackRoutes(app: Hono) {
  app.get("/api/calls/:callId/playback", async (c) => {
    const context = await createBackendContext({
      headers: c.req.raw.headers,
      auth,
    });

    if (!context.user) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    if (context.workspaceId == null || context.workspaceRole == null) {
      return c.json({ error: "Требуется активное рабочее пространство" }, 400);
    }

    const callId = c.req.param("callId");

    // Валидация UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(callId)) {
      return c.json({ error: "Некорректный формат ID звонка" }, 400);
    }

    const call = await context.callsService.getCall(callId);
    if (!call) {
      return c.json({ error: "Звонок не найден" }, 404);
    }
    if (call.workspaceId !== context.workspaceId) {
      return c.json({ error: "Нет доступа" }, 403);
    }
    if (!call.fileId) {
      return c.json({ error: "Запись недоступна" }, 404);
    }

    const file = await filesService.getFileById(call.fileId);
    if (!file) {
      return c.json({ error: "Файл не найден" }, 404);
    }

    const url = await getDownloadUrl(file.storageKey);
    const range = c.req.header("Range") ?? undefined;

    // Fetch с timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        headers: range ? { Range: range } : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return c.json({ error: "Timeout при получении записи" }, 504);
      }
      return c.json({ error: "Не удалось получить запись" }, 502);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstream.ok && upstream.status !== 206) {
      return c.json({ error: "Не удалось получить запись" }, 502);
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);
    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const acceptRanges = upstream.headers.get("Accept-Ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) headers.set("Content-Range", contentRange);

    // Cache control для аудио
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  });
}
