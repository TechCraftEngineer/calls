import { type NextRequest, NextResponse } from "next/server";
import { env } from "@calls/config/env";

/** AssemblyAI требует nodejs runtime для upload (FormData, большие файлы) */
export const runtime = "nodejs";

const ASSEMBLYAI_BASE = "https://api.assemblyai.com";

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string,
) {
  const key = env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "AssemblyAI API key not configured" },
      { status: 503 },
    );
  }

  const targetPath = path.join("/");
  const url = `${ASSEMBLYAI_BASE}/${targetPath}`;

  const headers: HeadersInit = {
    Authorization: key,
    "Content-Type": "application/json",
  };

  let body: string | FormData | undefined;

  if (method === "POST" && request.body) {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
      delete (headers as Record<string, string>)["Content-Type"];
    } else {
      const json = await request.json();
      body = JSON.stringify(json);
    }
  }

  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? { Authorization: key } : headers,
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("AssemblyAI API error:", error);
    return NextResponse.json(
      { error: "AssemblyAI API error", details: error },
      { status: res.status },
    );
  }

  const text = await res.text();
  if (!text) return new NextResponse(null, { status: res.status });
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "text/plain",
      },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  try {
    return proxyRequest(request, path, "POST");
  } catch (error) {
    console.error("AssemblyAI proxy error:", error);
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
    console.error("AssemblyAI proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
