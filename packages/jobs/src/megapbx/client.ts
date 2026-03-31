import type { MegaPbxIntegrationConfig } from "@calls/db";
import { z } from "zod";

/** CRM API v1: https://api.megapbx.ru/#/docs/crmapi/v1/ */
const MEGAPBX_ENDPOINTS = {
  employees: "/crmapi/v1/users",
  numbers: "/crmapi/v1/sims",
  calls: "/crmapi/v1/history/json",
} as const;

const RecordSchema = z.record(z.string(), z.unknown());
const AnyObjectOrArrayResponseSchema = z.union([z.array(RecordSchema), RecordSchema]);

export const EmployeeResponseSchema = AnyObjectOrArrayResponseSchema;
export const NumberResponseSchema = AnyObjectOrArrayResponseSchema;
export const CallResponseSchema = AnyObjectOrArrayResponseSchema;

function validateResponse<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  context: string,
): z.output<TSchema> {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "";
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");

  throw new Error(
    `Некорректный ответ MegaPBX (${context}). Проверьте настройки интеграции и формат ответа API.${
      details ? ` Детали: ${details}` : ""
    }`,
  );
}

function pickArray(payload: unknown, resultKey?: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
    );
  }

  if (resultKey && payload && typeof payload === "object") {
    const nested = (payload as Record<string, unknown>)[resultKey];
    if (Array.isArray(nested)) {
      return nested.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      );
    }
  }

  if (payload && typeof payload === "object") {
    const commonKeys = [
      "items",
      "data",
      "result",
      "users",
      "employees",
      "numbers",
      "calls",
      "history",
      "telnums",
    ];
    for (const key of commonKeys) {
      const nested = (payload as Record<string, unknown>)[key];
      if (Array.isArray(nested)) {
        return nested.filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
        );
      }
    }
  }

  return [];
}

/** Ключи, под которыми MegaPBX CRM API отдаёт списки (api.megapbx.ru crmapi/v1). */
const LIST_RESPONSE_KEYS = [
  "items",
  "data",
  "result",
  "users",
  "employees",
  "numbers",
  "calls",
  "history",
  "telnums",
] as const;

/**
 * Отсекает типичные JSON-ответы об ошибке при HTTP 200 (неверный ключ, прокси и т.п.).
 */
function rejectMegaPbxErrorJsonBody(payload: unknown): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return;
  }
  const o = payload as Record<string, unknown>;

  if (typeof o.error === "string" && o.error.trim()) {
    throw new Error(o.error.trim());
  }
  if (o.success === false) {
    const msg =
      typeof o.message === "string" && o.message.trim() ? o.message.trim() : "Запрос отклонён API";
    throw new Error(msg);
  }
  const code = o.status ?? o.statusCode;
  if (typeof code === "number" && code >= 400) {
    const msg =
      typeof o.message === "string" && o.message.trim() ? o.message.trim() : `Код ошибки ${code}`;
    throw new Error(msg);
  }
}

/**
 * Требует, чтобы ответ походил на список CRM, а не на произвольный JSON/HTML-обёртку.
 */
function assertListLikeMegaPbxPayload(payload: unknown): void {
  if (Array.isArray(payload)) {
    return;
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Некорректный ответ API.");
  }
  const o = payload as Record<string, unknown>;
  if (Object.keys(o).length === 0) {
    throw new Error("Пустой объект в ответе API.");
  }
  for (const key of LIST_RESPONSE_KEYS) {
    if (Array.isArray(o[key])) {
      return;
    }
  }
  for (const v of Object.values(o)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      continue;
    }
    const inner = v as Record<string, unknown>;
    for (const key of LIST_RESPONSE_KEYS) {
      if (Array.isArray(inner[key])) {
        return;
      }
    }
  }
  if (typeof o.message === "string" && o.message.trim()) {
    throw new Error(o.message.trim());
  }
  throw new Error(
    "Ответ не похож на список MegaPBX CRM. Проверьте base URL, API key и доступ к /crmapi/v1/users.",
  );
}

export class MegaPbxClient {
  constructor(private config: MegaPbxIntegrationConfig) {}

  /** Формат API: YYYYmmddTHHMMSSZ */
  private toMegaPbxDateTime(value: string): string | null {
    const v = value.trim();
    if (!v) return null;

    if (/^\d{8}T\d{6}Z$/.test(v)) {
      return v;
    }

    // YYYY-MM-DD -> начало дня UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return `${v.replace(/-/g, "")}T000000Z`;
    }

    const date = new Date(v);
    if (Number.isNaN(date.getTime())) return null;

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
  }

  private getRequestTimeoutMs(): number {
    const raw = Number(process.env.MEGAPBX_API_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
  }

  private getRecordingDownloadTimeoutMs(): number {
    const raw = Number(process.env.MEGAPBX_RECORDING_DOWNLOAD_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
  }

  private buildUrl(path: string): URL {
    const looksLikeScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
    const isRelativePath = path.startsWith("/") && !path.startsWith("//") && !looksLikeScheme;
    if (!isRelativePath) {
      throw new Error(
        'Некорректный путь MegaPBX API: ожидается относительный путь, начинающийся с "/".',
      );
    }

    const rawBaseUrl = this.config.baseUrl.trim();
    const normalizedBaseUrl =
      rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://")
        ? rawBaseUrl
        : `https://${rawBaseUrl}`;
    const base = new URL(normalizedBaseUrl);
    const basePath = base.pathname.replace(/\/+$/, "");
    let endpointPath = path.replace(/^\/+/, "");
    // Совместимость: если base уже указывает на /crmapi/v1, не дублируем путь
    if (basePath.endsWith("/crmapi/v1") && endpointPath.startsWith("crmapi/v1/")) {
      endpointPath = endpointPath.slice(10);
    }
    base.pathname = `${basePath}/${endpointPath}`.replace(/\/{2,}/g, "/");
    return base;
  }

  private buildHeaders(): HeadersInit {
    return {
      Accept: "application/json",
      "X-API-KEY": this.config.apiKey,
    };
  }

  private async request(
    path: string,
    body?: Record<string, unknown>,
    method: "GET" | "POST" = "GET",
  ): Promise<unknown> {
    const url = this.buildUrl(path);
    if (method === "GET" && body) {
      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    const timeoutMs = this.getRequestTimeoutMs();
    const controllerSignal = AbortSignal.timeout(timeoutMs);
    const response = await fetch(url, {
      method,
      headers: {
        ...this.buildHeaders(),
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: controllerSignal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const urlForLog = url.toString().replace(/([?&]apiKey=)[^&]*/gi, "$1***");
      let detail = "";
      try {
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        const msg =
          typeof parsed.message === "string"
            ? parsed.message
            : typeof parsed.error === "string"
              ? parsed.error
              : typeof parsed.detail === "string"
                ? parsed.detail
                : typeof parsed.reason === "string"
                  ? parsed.reason
                  : typeof parsed.description === "string"
                    ? parsed.description
                    : undefined;
        if (msg) detail = ` — ${msg}`;
      } catch {
        if (bodyText.trim()) {
          const preview = bodyText.length > 200 ? `${bodyText.slice(0, 200)}…` : bodyText;
          detail = bodyText.slice(0, 10).startsWith("<")
            ? " — ответ не JSON (возможно HTML)"
            : ` — ${preview}`;
        }
      }
      throw new Error(
        `Ошибка MegaPBX API ${response.status}: ${response.statusText}${detail} | URL: ${urlForLog} | endpoint: ${path}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async testConnection(): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const payload = await this.request(MEGAPBX_ENDPOINTS.employees);
      rejectMegaPbxErrorJsonBody(payload);
      validateResponse(EmployeeResponseSchema, payload, "проверка API (сотрудники)");
      assertListLikeMegaPbxPayload(payload);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchEmployees(): Promise<Record<string, unknown>[]> {
    const payload = await this.request(MEGAPBX_ENDPOINTS.employees);
    rejectMegaPbxErrorJsonBody(payload);
    assertListLikeMegaPbxPayload(payload);
    const validated = validateResponse(EmployeeResponseSchema, payload, "сотрудники");
    return pickArray(validated);
  }

  async fetchNumbers(): Promise<Record<string, unknown>[]> {
    const payload = await this.request(MEGAPBX_ENDPOINTS.numbers);
    rejectMegaPbxErrorJsonBody(payload);
    assertListLikeMegaPbxPayload(payload);
    const validated = validateResponse(NumberResponseSchema, payload, "номера");
    return pickArray(validated);
  }

  async fetchCalls(cursor?: string | null): Promise<Record<string, unknown>[]> {
    const startRaw = cursor ?? this.config.syncFromDate ?? null;
    const start = startRaw ? this.toMegaPbxDateTime(startRaw) : null;
    const body = start ? { start } : undefined;
    const payload = await this.request(MEGAPBX_ENDPOINTS.calls, body);
    rejectMegaPbxErrorJsonBody(payload);
    assertListLikeMegaPbxPayload(payload);
    const validated = validateResponse(CallResponseSchema, payload, "звонки");
    return pickArray(validated);
  }

  async downloadRecording(recordingUrl: string): Promise<{
    buffer: Buffer;
    extension: string;
  }> {
    const normalizedUrl = recordingUrl.trim();
    if (!normalizedUrl) {
      throw new Error("Пустой URL записи MegaPBX.");
    }

    let parsed: URL;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      throw new Error(`Некорректный URL записи MegaPBX: ${recordingUrl}`);
    }

    const rawBaseUrl = this.config.baseUrl.trim();
    const normalizedBaseUrl =
      rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://")
        ? rawBaseUrl
        : `https://${rawBaseUrl}`;
    const baseParsed = new URL(normalizedBaseUrl);
    const sameHost = parsed.hostname === baseParsed.hostname;
    const samePort = (parsed.port || "") === (baseParsed.port || "");
    const isTrustedRecordingUrl = parsed.protocol === "https:" && sameHost && samePort;
    if (!isTrustedRecordingUrl) {
      throw new Error(`Запрещён внешний URL записи MegaPBX: ${parsed.origin}.`);
    }

    const timeoutMs = this.getRecordingDownloadTimeoutMs();
    const response = await fetch(parsed, {
      headers: {
        Accept: "audio/*,application/octet-stream",
        ...(isTrustedRecordingUrl ? { "X-API-KEY": this.config.apiKey } : {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const preview = bodyText.trim()
        ? bodyText.length > 200
          ? `${bodyText.slice(0, 200)}…`
          : bodyText
        : "";
      throw new Error(
        `Не удалось скачать запись: ${response.status} ${response.statusText}${preview ? ` — ${preview}` : ""}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      return { buffer, extension: "mp3" };
    }

    const pathname = parsed.pathname.toLowerCase();
    if (pathname.endsWith(".wav")) return { buffer, extension: "wav" };
    if (pathname.endsWith(".ogg")) return { buffer, extension: "ogg" };
    if (pathname.endsWith(".m4a")) return { buffer, extension: "m4a" };
    if (pathname.endsWith(".mp3")) return { buffer, extension: "mp3" };

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("wav")) return { buffer, extension: "wav" };
    if (contentType.includes("ogg")) return { buffer, extension: "ogg" };
    if (contentType.includes("m4a") || contentType.includes("mp4")) {
      return { buffer, extension: "m4a" };
    }
    return { buffer, extension: "mp3" };
  }
}
