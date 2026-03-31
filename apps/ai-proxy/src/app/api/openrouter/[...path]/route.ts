import { env } from "@calls/config/env";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 503 });
  }

  const targetPath = path.join("/");
  const url = `${OPENROUTER_BASE}/${targetPath}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  let body: string | undefined;
  if (method === "POST" && request.body) {
    const json = await request.json();
    body = JSON.stringify(json);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("OpenRouter API error:", error);
    return NextResponse.json(
      { error: "OpenRouter API error", details: error },
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
    console.error("OpenRouter proxy error:", error);
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
    console.error("OpenRouter proxy error:", error);
    return NextResponse.json({ error: "Internal proxy error" }, { status: 500 });
  }
}
