import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export const runtime = "edge";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  try {
    const body = await request.json();
    const openaiPath = path.join("/");

    if (body.model?.startsWith("openai/")) {
      body.model = body.model.replace("openai/", "");
    }

    const openaiResponse = await fetch(
      `https://api.openai.com/v1/${openaiPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "OpenAI API error", details: error },
        { status: openaiResponse.status },
      );
    }

    const data = await openaiResponse.json();
    return NextResponse.json(data);
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

  try {
    const openaiPath = path.join("/");

    const openaiResponse = await fetch(
      `https://api.openai.com/v1/${openaiPath}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
      },
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      return NextResponse.json(
        { error: "OpenAI API error", details: error },
        { status: openaiResponse.status },
      );
    }

    const data = await openaiResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
