/**
 * Обратная совместимость: /api/chat/completions и т.д. → OpenAI.
 * Рекомендуется использовать /api/openai/... для явного указания провайдера.
 */
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@calls/config/env";

export const runtime = "edge";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 },
    );
  }
  try {
    const body = await request.json();
    const openaiPath = path.join("/");
    if (body.model?.startsWith("openai/")) {
      body.model = body.model.replace("openai/", "");
    }
    const res = await fetch(`https://api.openai.com/v1/${openaiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: "OpenAI API error", details: error },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 },
    );
  }
  try {
    const openaiPath = path.join("/");
    const res = await fetch(`https://api.openai.com/v1/${openaiPath}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: "OpenAI API error", details: error },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
