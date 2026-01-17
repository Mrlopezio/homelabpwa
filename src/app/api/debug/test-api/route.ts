import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.TOOLS_API_URL;
  const apiKey = process.env.TOOLS_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json({
      success: false,
      error: "Missing environment variables",
      hasApiUrl: !!apiUrl,
      hasApiKey: !!apiKey,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Try a simple request to check connectivity
    // Using HEAD or GET to test without creating data
    const response = await fetch(apiUrl, {
      method: "OPTIONS",
      headers: {
        "X-API-Key": apiKey,
      },
      signal: controller.signal,
    });

    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : "Unknown",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
