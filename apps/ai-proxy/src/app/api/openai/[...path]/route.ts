import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export const runtime = "edge";

const OPENAI_BASE = "https://api.openai.com/v1";

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string,
) {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 },
    );
  }

  const targetPath = path.join("/");
  const url = `${OPENAI_BASE}/${targetPath}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${key}`,
  };

  let body: string | FormData | undefined;
  const contentType = request.headers.get("content-type") ?? "";

  if (method === "POST" && request.body) {
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
      // fetch с FormData сам выставит Content-Type с boundary
    } else {
      const json = await request.json();
      if (json.model?.startsWith("openai/")) {
        json.model = json.model.replace("openai/", "");
      }
      body = JSON.stringify(json);
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method,
    headers:
      body instanceof FormData ? { Authorization: `Bearer ${key}` } : headers,
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "OpenAI API error", details: error },
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
    console.error("OpenAI proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
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
    console.error("OpenAI proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
