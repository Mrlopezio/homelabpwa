import { NextRequest, NextResponse } from "next/server";

// Ensure this route is always dynamic
export const dynamic = "force-dynamic";

interface ToolPayload {
  name: string;
  description: string;
  url: string;
  tags: string[];
}

async function sendToToolsApi(payload: ToolPayload): Promise<boolean> {
  const apiKey = process.env.TOOLS_API_KEY;

  if (!apiKey) {
    console.error("TOOLS_API_KEY not configured");
    return false;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send to tools API:", response.status);
      return false;
    }

    console.log("Successfully sent to tools API");
    return true;
  } catch (error) {
    console.error("Error sending to tools API:", error);
    return false;
  }
}

function extractTags(text: string | null): string[] {
  if (!text) return [];

  // Extract hashtags from text
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);

  if (matches) {
    return matches.map((tag) => tag.slice(1).toLowerCase());
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;

    console.log("Received share:", { title, text, url });

    // Build the payload for the tools API
    const payload: ToolPayload = {
      name: title || text?.slice(0, 50) || "Shared Item",
      description: text || title || "",
      url: url || "",
      tags: extractTags(text),
    };

    // Send to tools API
    const success = await sendToToolsApi(payload);

    // Build redirect URL with status
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    params.set("shared_status", success ? "success" : "error");

    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = params.toString();

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Share target error:", error);
    const redirectUrl = new URL("/?shared_status=error", request.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for share target (for simpler shares without files)
  const searchParams = request.nextUrl.searchParams;

  const title = searchParams.get("title");
  const text = searchParams.get("text");
  const url = searchParams.get("url");

  console.log("Received share (GET):", { title, text, url });

  // Build the payload for the tools API
  const payload: ToolPayload = {
    name: title || text?.slice(0, 50) || "Shared Item",
    description: text || title || "",
    url: url || "",
    tags: extractTags(text),
  };

  // Send to tools API
  const success = await sendToToolsApi(payload);

  // Build redirect URL with status
  const params = new URLSearchParams();
  if (title) params.set("shared_title", title);
  if (text) params.set("shared_text", text);
  if (url) params.set("shared_url", url);
  params.set("shared_status", success ? "success" : "error");

  const redirectUrl = new URL("/", request.url);
  redirectUrl.search = params.toString();

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
