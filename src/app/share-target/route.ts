import { NextRequest, NextResponse } from "next/server";

// Ensure this route is always dynamic
export const dynamic = "force-dynamic";

interface ToolPayload {
  name: string;
  description: string;
  url: string;
  tags: string[];
}

interface ApiResult {
  success: boolean;
  error?: string;
  details?: string;
}

async function sendToToolsApi(payload: ToolPayload): Promise<ApiResult> {
  const apiKey = process.env.TOOLS_API_KEY;
  const apiUrl = process.env.TOOLS_API_URL;

  console.log("[share-target] Starting API call", {
    hasApiKey: !!apiKey,
    hasApiUrl: !!apiUrl,
    apiUrlPreview: apiUrl?.substring(0, 50),
    payload,
  });

  if (!apiKey) {
    console.error("[share-target] TOOLS_API_KEY not configured");
    return {
      success: false,
      error: "CONFIG_ERROR",
      details: "TOOLS_API_KEY not set",
    };
  }

  if (!apiUrl) {
    console.error("[share-target] TOOLS_API_URL not configured");
    return {
      success: false,
      error: "CONFIG_ERROR",
      details: "TOOLS_API_URL not set",
    };
  }

  try {
    console.log("[share-target] Fetching:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log("[share-target] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Could not read response");
      console.error("[share-target] API error:", response.status, errorText);
      return {
        success: false,
        error: `HTTP_${response.status}`,
        details: errorText.substring(0, 200),
      };
    }

    const responseData = await response.json().catch(() => ({}));
    console.log("[share-target] Success:", responseData);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[share-target] Fetch error:", errorMessage);
    return {
      success: false,
      error: "FETCH_ERROR",
      details: errorMessage,
    };
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

function extractUrlFromText(text: string | null): string | null {
  if (!text) return null;

  // Match URLs in the text
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);

  if (matches && matches.length > 0) {
    // Return the first URL found, cleaned up
    return matches[0].replace(/[.,;:!?)]+$/, ""); // Remove trailing punctuation
  }

  return null;
}

function removeUrlFromText(text: string | null, url: string | null): string {
  if (!text) return "";
  if (!url) return text;

  // Remove the URL from text to get clean description
  return text.replace(url, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const urlField = formData.get("url") as string | null;

    // Try to get URL from the url field, or extract it from text
    const url = urlField || extractUrlFromText(text);

    console.log("[share-target] Received share (POST):", {
      title,
      text,
      urlField,
      extractedUrl: url,
    });

    // URL is required by the API
    if (!url) {
      console.error("[share-target] No URL provided or found in text");
      const params = new URLSearchParams();
      if (title) params.set("shared_title", title);
      if (text) params.set("shared_text", text);
      params.set("shared_status", "error");
      params.set("shared_error", "MISSING_URL");
      params.set(
        "shared_details",
        "No URL found. Share a link to save a tool."
      );

      const redirectUrl = new URL("/", request.url);
      redirectUrl.search = params.toString();
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // Clean description by removing the URL from text
    const description = removeUrlFromText(text, url) || title || "";

    // Build the payload for the tools API
    // name: the page/app title, description: shared text (without URL), url: the link
    const payload: ToolPayload = {
      name: title || new URL(url).hostname || "Shared Tool",
      description: description,
      url: url,
      tags: extractTags(text),
    };

    // Send to tools API
    const result = await sendToToolsApi(payload);

    // Build redirect URL with status
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    params.set("shared_status", result.success ? "success" : "error");
    if (result.error) params.set("shared_error", result.error);
    if (result.details)
      params.set("shared_details", result.details.substring(0, 100));

    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = params.toString();

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("[share-target] Unexpected error:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const redirectUrl = new URL(
      `/?shared_status=error&shared_error=UNEXPECTED&shared_details=${encodeURIComponent(
        errorMsg.substring(0, 100)
      )}`,
      request.url
    );
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle GET requests for share target (for simpler shares without files)
    const searchParams = request.nextUrl.searchParams;

    const title = searchParams.get("title");
    const text = searchParams.get("text");
    const urlField = searchParams.get("url");

    // Try to get URL from the url field, or extract it from text
    const url = urlField || extractUrlFromText(text);

    console.log("[share-target] Received share (GET):", {
      title,
      text,
      urlField,
      extractedUrl: url,
    });

    // URL is required by the API
    if (!url) {
      console.error("[share-target] No URL provided or found in text");
      const params = new URLSearchParams();
      if (title) params.set("shared_title", title);
      if (text) params.set("shared_text", text);
      params.set("shared_status", "error");
      params.set("shared_error", "MISSING_URL");
      params.set(
        "shared_details",
        "No URL found. Share a link to save a tool."
      );

      const redirectUrl = new URL("/", request.url);
      redirectUrl.search = params.toString();
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // Clean description by removing the URL from text
    const description = removeUrlFromText(text, url) || title || "";

    // Build the payload for the tools API
    // name: the page/app title, description: shared text (without URL), url: the link
    const payload: ToolPayload = {
      name: title || new URL(url).hostname || "Shared Tool",
      description: description,
      url: url,
      tags: extractTags(text),
    };

    // Send to tools API
    const result = await sendToToolsApi(payload);

    // Build redirect URL with status
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    params.set("shared_status", result.success ? "success" : "error");
    if (result.error) params.set("shared_error", result.error);
    if (result.details)
      params.set("shared_details", result.details.substring(0, 100));

    const redirectUrl = new URL("/", request.url);
    redirectUrl.search = params.toString();

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("[share-target] Unexpected error (GET):", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const redirectUrl = new URL(
      `/?shared_status=error&shared_error=UNEXPECTED&shared_details=${encodeURIComponent(
        errorMsg.substring(0, 100)
      )}`,
      request.url
    );
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
