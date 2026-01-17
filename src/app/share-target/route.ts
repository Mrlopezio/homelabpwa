import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;
    const files = formData.getAll("files") as File[];

    // Log received share data (replace with your own logic)
    console.log("Received share:", { title, text, url, filesCount: files.length });

    // Store the shared data in a way that can be accessed by the client
    // For now, redirect to home with query params
    const params = new URLSearchParams();
    if (title) params.set("shared_title", title);
    if (text) params.set("shared_text", text);
    if (url) params.set("shared_url", url);
    if (files.length > 0) params.set("shared_files", files.length.toString());

    return NextResponse.redirect(new URL(`/?${params.toString()}`, request.url));
  } catch (error) {
    console.error("Share target error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for share target (for simpler shares without files)
  const searchParams = request.nextUrl.searchParams;
  
  const title = searchParams.get("title");
  const text = searchParams.get("text");
  const url = searchParams.get("url");

  const params = new URLSearchParams();
  if (title) params.set("shared_title", title);
  if (text) params.set("shared_text", text);
  if (url) params.set("shared_url", url);

  return NextResponse.redirect(new URL(`/?${params.toString()}`, request.url));
}
