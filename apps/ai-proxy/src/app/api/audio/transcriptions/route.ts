/**
 * Обратная совместимость: /api/audio/transcriptions → OpenAI Whisper.
 * Альтернатива: POST /api/openai/audio/transcriptions
 */
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 },
    );
  }
  try {
    const formData = await request.formData();
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
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
    console.error("Transcription proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
