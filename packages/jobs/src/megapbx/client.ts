import type {
  MegaPbxEndpointConfig,
  MegaPbxIntegrationConfig,
} from "@calls/db";

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

export class MegaPbxClient {
  constructor(private config: MegaPbxIntegrationConfig) {}

  private buildUrl(path: string): URL {
    const url = new URL(path, `${this.config.baseUrl.replace(/\/$/, "")}/`);
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
      headers[this.config.apiKeyHeader || "X-API-Key"] = this.config.apiKey;
    }

    return headers;
  }

  async request(
    endpoint: MegaPbxEndpointConfig,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = this.buildUrl(endpoint.path);
    const method = endpoint.method ?? "GET";
    const response = await fetch(url, {
      method,
      headers: {
        ...this.buildHeaders(),
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });

    if (!response.ok) {
      throw new Error(`MegaPBX API ${response.status}: ${response.statusText}`);
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
      const endpoint =
        this.config.employeesEndpoint ??
        this.config.numbersEndpoint ??
        this.config.callsEndpoint;

      if (endpoint) {
        await this.request(endpoint);
      } else {
        const response = await fetch(this.buildUrl("/"), {
          headers: this.buildHeaders(),
        });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
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
    return pickArray(payload, this.config.employeesEndpoint.resultKey);
  }

  async fetchNumbers(): Promise<Record<string, unknown>[]> {
    if (!this.config.numbersEndpoint?.path) return [];
    const payload = await this.request(this.config.numbersEndpoint);
    return pickArray(payload, this.config.numbersEndpoint.resultKey);
  }

  async fetchCalls(cursor?: string | null): Promise<Record<string, unknown>[]> {
    if (!this.config.callsEndpoint?.path) return [];
    const body = cursor ? { cursor, from: cursor } : undefined;
    const payload = await this.request(this.config.callsEndpoint, body);
    return pickArray(payload, this.config.callsEndpoint.resultKey);
  }
}
