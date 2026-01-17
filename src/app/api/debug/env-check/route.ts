import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasApiUrl: !!process.env.TOOLS_API_URL,
    hasApiKey: !!process.env.TOOLS_API_KEY,
    apiUrlPreview: process.env.TOOLS_API_URL
      ? `${process.env.TOOLS_API_URL.substring(0, 30)}...`
      : null,
  });
}
