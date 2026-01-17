import { NextRequest, NextResponse } from "next/server";

// Ensure this route is always dynamic
export const dynamic = "force-dynamic";

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

    // Build redirect URL with pending status (don't send to API yet)
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    params.set("shared_status", "pending");
    // Pass extracted tags as comma-separated
    const tags = extractTags(text);
    if (tags.length > 0) params.set("shared_tags", tags.join(","));

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

    // Build redirect URL with pending status (don't send to API yet)
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    params.set("shared_status", "pending");
    // Pass extracted tags as comma-separated
    const tags = extractTags(text);
    if (tags.length > 0) params.set("shared_tags", tags.join(","));

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
