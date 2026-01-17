import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.TOOLS_API_URL;

  let urlInfo: {
    host?: string;
    pathname?: string;
    valid: boolean;
    error?: string;
  } = { valid: false };

  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      urlInfo = {
        host: parsed.host,
        pathname: parsed.pathname,
        valid: true,
      };
    } catch (e) {
      urlInfo = { valid: false, error: "Invalid URL format" };
    }
  }

  return NextResponse.json({
    hasApiUrl: !!apiUrl,
    hasApiKey: !!process.env.TOOLS_API_KEY,
    apiKeyLength: process.env.TOOLS_API_KEY?.length || 0,
    urlInfo,
    hint:
      urlInfo.pathname === "/" || urlInfo.pathname === ""
        ? "WARNING: URL path is '/' - should be '/api/tools' or similar"
        : null,
  });
}
