import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      },
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI transcription error:", error);
      return NextResponse.json(
        { error: "OpenAI API error", details: error },
        { status: openaiResponse.status },
      );
    }

    const data = await openaiResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Transcription proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
