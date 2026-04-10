import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const TELEGRAM_BASE = "https://api.telegram.org";

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const targetPath = path.join("/");

  // Telegram API формат: /bot{TOKEN}/METHOD
  // Наш прокси формат: /api/telegram/bot{TOKEN}/METHOD
  const url = new URL(`${TELEGRAM_BASE}/${targetPath}`);

  // Логируем входящий запрос
  console.log(`[Telegram Proxy] ${method} ${targetPath}`);
  console.log(`[Telegram Proxy] Query params:`, Object.fromEntries(request.nextUrl.searchParams));

  // Передаем query parameters для GET запросов
  if (method === "GET") {
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: HeadersInit = {};

  let body: string | FormData | undefined;
  const contentType = request.headers.get("content-type") ?? "";

  if (method === "POST" && request.body) {
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
      console.log(`[Telegram Proxy] FormData body`);
    } else {
      const jsonBody = await request.json();
      console.log(`[Telegram Proxy] JSON body:`, jsonBody);

      // Валидация: проверяем, что текст сообщения не пустой
      if (typeof jsonBody === "object" && jsonBody !== null && "text" in jsonBody) {
        if (!jsonBody.text || (typeof jsonBody.text === "string" && !jsonBody.text.trim())) {
          console.error("[Telegram Proxy] Message text is empty");
          return NextResponse.json(
            { error: "Bad Request", description: "message text is empty" },
            { status: 400 },
          );
        }
      }

      body = JSON.stringify(jsonBody);
      headers["Content-Type"] = "application/json";
    }
  } else if (method === "POST") {
    console.log(`[Telegram Proxy] POST request without body`);
  } else if (method === "GET") {
    console.log(`[Telegram Proxy] GET request with URL: ${url.toString()}`);

    // Валидация для GET: проверяем text в query params
    const textParam = url.searchParams.get("text");
    if (!textParam?.trim()) {
      console.error("[Telegram Proxy] Message text is empty in query params");
      return NextResponse.json(
        { error: "Bad Request", description: "message text is empty" },
        { status: 400 },
      );
    }
  }

  console.log(`[Telegram Proxy] Sending to Telegram: ${method} ${url.toString()}`);
  console.log(`[Telegram Proxy] Request headers:`, headers);
  console.log(
    `[Telegram Proxy] Request body type:`,
    body instanceof FormData ? "FormData" : typeof body,
  );

  const res = await fetch(url.toString(), {
    method,
    headers: body instanceof FormData ? {} : headers,
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Telegram API error:", error);
    return NextResponse.json(
      { error: "Telegram API error", details: error },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  try {
    return proxyRequest(request, path, "POST");
  } catch (error) {
    console.error("Telegram proxy error:", error);
    return NextResponse.json({ error: "Internal proxy error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  try {
    return proxyRequest(request, path, "GET");
  } catch (error) {
    console.error("Telegram proxy error:", error);
    return NextResponse.json({ error: "Internal proxy error" }, { status: 500 });
  }
}
