import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ToolPayload {
  url: string;
  category_id: number;
  tags: string[];
  is_favorite: boolean;
}

interface ToolResponse {
  id: number;
  name: string;
  description: string;
  url: string;
  logo_url: string;
  screenshot_url: string;
  tags: string[];
  category_id: number;
  category_name: string;
  category_color: string;
  is_favorite: boolean;
  display_order: number;
  metadata_status: string;
  created_at: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Build the payload with the new schema
    const payload: ToolPayload = {
      url: body.url,
      category_id: body.category_id ?? 0,
      tags: body.tags ?? [],
      is_favorite: body.is_favorite ?? false,
    };

    if (!payload.url) {
      return NextResponse.json(
        { error: "URL is required" },
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

    const responseData: ToolResponse = await response.json().catch(() => ({}));
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
