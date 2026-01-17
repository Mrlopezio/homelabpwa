import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ToolPayload {
  name: string;
  description: string;
  url: string;
  tags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const payload: ToolPayload = await request.json();

    if (!payload.url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    if (!payload.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.TOOLS_API_KEY;
    const apiUrl = process.env.TOOLS_API_URL;

    console.log("[tools/send] Sending tool to API", {
      hasApiKey: !!apiKey,
      hasApiUrl: !!apiUrl,
      payload,
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "TOOLS_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!apiUrl) {
      return NextResponse.json(
        { error: "TOOLS_API_URL not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log("[tools/send] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Could not read response");
      console.error("[tools/send] API error:", response.status, errorText);
      return NextResponse.json(
        { error: `HTTP_${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const responseData = await response.json().catch(() => ({}));
    console.log("[tools/send] Success:", responseData);

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[tools/send] Error:", errorMessage);
    return NextResponse.json(
      { error: "FETCH_ERROR", details: errorMessage },
      { status: 500 }
    );
  }
}
