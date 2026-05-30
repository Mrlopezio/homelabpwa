import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NotePayload {
  url?: string;
  title?: string;
  text?: string;
  tags: string[];
}

// Resolve the Obsidian "Create Note" endpoint. Prefer an explicit env var,
// otherwise reuse the same host as the Tools API (same server, same key).
function resolveObsidianUrl(): string | null {
  if (process.env.OBSIDIAN_API_URL) return process.env.OBSIDIAN_API_URL;
  const toolsUrl = process.env.TOOLS_API_URL;
  if (!toolsUrl) return null;
  try {
    return `${new URL(toolsUrl).origin}/api/obsidian/notes`;
  } catch {
    return null;
  }
}

// lowercase-with-hyphens, stripped of diacritics and filesystem-unsafe chars
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildTitle(p: NotePayload): string {
  if (p.title) return p.title;
  if (p.url) {
    try {
      return new URL(p.url).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  return "untitled";
}

function buildNote(
  p: NotePayload,
  date: string
): { path: string; content: string } {
  const title = buildTitle(p);
  const slug = slugify(title) || "untitled";

  const folder = (process.env.OBSIDIAN_FOLDER || "ideas/inbox").replace(
    /\/+$/,
    ""
  );
  const path = `${folder}/${date}-${slug}.md`;

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    p.url ? `source: ${p.url}` : null,
    p.tags.length ? `tags: [${p.tags.join(", ")}]` : null,
    `saved: ${date}`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const body = [
    `# ${title}`,
    p.text ? `\n${p.text}` : null,
    p.url ? `\n[Open link](${p.url})` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { path, content: `${frontmatter}\n\n${body}\n` };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload: NotePayload = {
      url: body.url || undefined,
      title: body.title || undefined,
      text: body.text || undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
    };

    if (!payload.url && !payload.title && !payload.text) {
      return NextResponse.json(
        { error: "Nothing to save: provide a url, title or text" },
        { status: 400 }
      );
    }

    const apiKey = process.env.TOOLS_API_KEY;
    const apiUrl = resolveObsidianUrl();

    if (!apiKey) {
      return NextResponse.json(
        { error: "TOOLS_API_KEY not configured" },
        { status: 500 }
      );
    }
    if (!apiUrl) {
      return NextResponse.json(
        { error: "OBSIDIAN_API_URL / TOOLS_API_URL not configured" },
        { status: 500 }
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const note = buildNote(payload, date);

    console.log("[obsidian/send] Creating note", { path: note.path });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        path: note.path,
        content: note.content,
        overwrite: false,
      }),
    });

    console.log("[obsidian/send] Response status:", response.status);

    if (!response.ok) {
      const details = await response
        .text()
        .catch(() => "Could not read response");
      console.error("[obsidian/send] API error:", response.status, details);
      return NextResponse.json(
        { error: `HTTP_${response.status}`, details },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    console.log("[obsidian/send] Success:", data);

    return NextResponse.json({
      success: true,
      path: note.path,
      title: buildTitle(payload),
      data,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("[obsidian/send] Error:", details);
    return NextResponse.json({ error: "FETCH_ERROR", details }, { status: 500 });
  }
}
