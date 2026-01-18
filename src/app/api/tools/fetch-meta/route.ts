import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FetchMetaRequest {
  url: string;
}

interface FetchMetaResponse {
  url: string;
  title: string;
  description: string;
  logo_url: string;
  screenshot_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FetchMetaRequest = await request.json();

    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const apiKey = process.env.TOOLS_API_KEY;
    const apiUrl = process.env.TOOLS_API_URL;

    if (!apiKey || !apiUrl) {
      return NextResponse.json(
        { error: "API configuration missing" },
        { status: 500 }
      );
    }

    // Build the fetch-meta URL based on the tools API URL
    // Assuming the fetch-meta endpoint is at the same base as the tools API
    const baseUrl = apiUrl.replace(/\/tools\/?$/, "");
    const fetchMetaUrl = `${baseUrl}/tools/fetch-meta`;

    console.log("[fetch-meta] Fetching metadata for:", body.url);
    console.log("[fetch-meta] API URL:", fetchMetaUrl);

    const response = await fetch(fetchMetaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ url: body.url }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[fetch-meta] API error:", response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data: FetchMetaResponse = await response.json();
    console.log("[fetch-meta] Success:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[fetch-meta] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata", details: String(error) },
      { status: 500 }
    );
  }
}
