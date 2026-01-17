export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function canShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

export function canShareFiles(): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare;
}

export async function share(data: ShareData): Promise<boolean> {
  if (!canShare()) {
    console.warn("Web Share API not supported");
    return false;
  }

  try {
    // Check if we can share files
    if (data.files && data.files.length > 0) {
      if (!canShareFiles() || !navigator.canShare({ files: data.files })) {
        // Fall back to sharing without files
        const { files, ...dataWithoutFiles } = data;
        await navigator.share(dataWithoutFiles);
        return true;
      }
    }

    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      // User cancelled the share
      return false;
    }
    console.error("Share failed:", error);
    return false;
  }
}

export function parseSharedContent(searchParams: URLSearchParams): ShareData | null {
  const title = searchParams.get("shared_title");
  const text = searchParams.get("shared_text");
  const url = searchParams.get("shared_url");
  const filesCount = searchParams.get("shared_files");

  if (!title && !text && !url && !filesCount) {
    return null;
  }

  return {
    title: title || undefined,
    text: text || undefined,
    url: url || undefined,
  };
}
