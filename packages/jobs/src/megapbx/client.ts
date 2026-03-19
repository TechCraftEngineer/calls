import type {
  MegaPbxEndpointConfig,
  MegaPbxIntegrationConfig,
} from "@calls/db";
import { z } from "zod";

const RecordSchema = z.record(z.string(), z.unknown());
const AnyObjectOrArrayResponseSchema = z.union([
  z.array(RecordSchema),
  RecordSchema,
]);

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

function pickArray(
  payload: unknown,
  resultKey?: string,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    );
  }

  if (resultKey && payload && typeof payload === "object") {
    const nested = (payload as Record<string, unknown>)[resultKey];
    if (Array.isArray(nested)) {
      return nested.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      );
    }
  }

  if (payload && typeof payload === "object") {
    const commonKeys = [
      "items",
      "data",
      "result",
      "employees",
      "numbers",
      "calls",
    ];
    for (const key of commonKeys) {
      const nested = (payload as Record<string, unknown>)[key];
      if (Array.isArray(nested)) {
        return nested.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        );
      }
    }
  }

  return [];
}

/** Ключи, под которыми MegaPBX CRM обычно отдаёт списки (как в pickArray). */
const LIST_RESPONSE_KEYS = [
  "items",
  "data",
  "result",
  "employees",
  "numbers",
  "calls",
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
      typeof o.message === "string" && o.message.trim()
        ? o.message.trim()
        : "Запрос отклонён API";
    throw new Error(msg);
  }
  const code = o.status ?? o.statusCode;
  if (typeof code === "number" && code >= 400) {
    const msg =
      typeof o.message === "string" && o.message.trim()
        ? o.message.trim()
        : `Код ошибки ${code}`;
    throw new Error(msg);
  }
}

/**
 * Требует, чтобы ответ походил на список CRM, а не на произвольный JSON/HTML-обёртку.
 */
function assertListLikeMegaPbxPayload(
  payload: unknown,
  resultKey?: string,
): void {
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
  if (resultKey && Array.isArray(o[resultKey])) {
    return;
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
    if (resultKey && Array.isArray(inner[resultKey])) {
      return;
    }
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
    "Ответ не похож на список MegaPBX CRM. Проверьте base URL, API key и доступ к /crm/employees.",
  );
}

async function readResponseJsonOrThrow(response: Response): Promise<unknown> {
  const raw = await response.text();
  const trimmed = raw.trim();
  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  const looksLikeJson =
    ct.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (!looksLikeJson) {
    throw new Error(
      "Ответ не в формате JSON. Проверьте base URL — возможно, открылась HTML-страница или не тот хост.",
    );
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("Не удалось разобрать JSON в ответе API.");
  }
}

export class MegaPbxClient {
  constructor(private config: MegaPbxIntegrationConfig) {}

  private getRequestTimeoutMs(): number {
    const raw = Number(process.env.MEGAPBX_API_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
  }

  private buildUrl(path: string): URL {
    const looksLikeScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
    const isRelativePath =
      path.startsWith("/") && !path.startsWith("//") && !looksLikeScheme;
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
    // Совместимость: если base уже указывает на /crmapi/v1, endpoint "crm/*"
    // должен идти как "*/", иначе получаем дублирование ".../crmapi/v1/crm/...".
    if (basePath.endsWith("/crmapi/v1") && endpointPath.startsWith("crm/")) {
      endpointPath = endpointPath.slice(4);
    }
    base.pathname = `${basePath}/${endpointPath}`.replace(/\/{2,}/g, "/");
    const url = base;
    if (this.config.authScheme === "query") {
      url.searchParams.set("apiKey", this.config.apiKey);
    }
    return url;
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.config.authScheme === "bearer") {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    } else if (this.config.authScheme === "x-api-key") {
      headers[this.config.apiKeyHeader || "X-API-KEY"] = this.config.apiKey;
    }

    return headers;
  }

  async request(
    endpoint: MegaPbxEndpointConfig,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = this.buildUrl(endpoint.path);
    const method = endpoint.method ?? "GET";
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
      throw new Error(
        `Ошибка MegaPBX API ${response.status}: ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async testConnection(): Promise<
    { success: true } | { success: false; error: string }
  > {
    try {
      const endpoint = this.config.employeesEndpoint ??
        this.config.numbersEndpoint ??
        this.config.callsEndpoint ?? {
          path: "/crm/employees",
          method: "GET" as const,
        };

      if (endpoint.path) {
        const url = this.buildUrl(endpoint.path);
        const method = endpoint.method ?? "GET";
        const timeoutMs = this.getRequestTimeoutMs();
        const controllerSignal = AbortSignal.timeout(timeoutMs);
        const response = await fetch(url, {
          method,
          headers: {
            ...this.buildHeaders(),
            ...(method === "POST"
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body: method === "POST" ? JSON.stringify({}) : undefined,
          signal: controllerSignal,
        });

        if (!response.ok) {
          throw new Error(
            `Ошибка MegaPBX API ${response.status}: ${response.statusText}`,
          );
        }

        const payload = await readResponseJsonOrThrow(response);
        rejectMegaPbxErrorJsonBody(payload);
        validateResponse(
          EmployeeResponseSchema,
          payload,
          "проверка API (сотрудники)",
        );
        assertListLikeMegaPbxPayload(payload, endpoint.resultKey);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchEmployees(): Promise<Record<string, unknown>[]> {
    if (!this.config.employeesEndpoint?.path) return [];
    const payload = await this.request(this.config.employeesEndpoint);
    const validated = validateResponse(
      EmployeeResponseSchema,
      payload,
      "сотрудники",
    );
    return pickArray(validated, this.config.employeesEndpoint.resultKey);
  }

  async fetchNumbers(): Promise<Record<string, unknown>[]> {
    if (!this.config.numbersEndpoint?.path) return [];
    const payload = await this.request(this.config.numbersEndpoint);
    const validated = validateResponse(NumberResponseSchema, payload, "номера");
    return pickArray(validated, this.config.numbersEndpoint.resultKey);
  }

  async fetchCalls(cursor?: string | null): Promise<Record<string, unknown>[]> {
    if (!this.config.callsEndpoint?.path) return [];
    const from = this.config.syncFromDate || null;
    const body = cursor ? { cursor } : from ? { from } : undefined;
    const payload = await this.request(this.config.callsEndpoint, body);
    const validated = validateResponse(CallResponseSchema, payload, "звонки");
    return pickArray(validated, this.config.callsEndpoint.resultKey);
  }
}
