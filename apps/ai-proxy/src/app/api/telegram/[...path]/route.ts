import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const TELEGRAM_BASE = "https://api.telegram.org";

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const targetPath = path.join("/");

  // Telegram API формат: /bot{TOKEN}/METHOD
  // Наш прокси формат: /api/telegram/bot{TOKEN}/METHOD
  const url = new URL(`${TELEGRAM_BASE}/${targetPath}`);

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
    } else {
      body = await request.json();
      headers["Content-Type"] = "application/json";
    }
  }

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
