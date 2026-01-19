"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DebugPanel } from "@/components/DebugPanel";

interface SharedContent {
  title?: string;
  text?: string;
  url?: string;
  filesCount?: number;
  status?: "success" | "error" | "pending";
  error?: string;
  details?: string;
  tags?: string[];
}

interface SavedTool {
  id: number;
  name: string;
  description: string;
  url: string;
  logo_url: string;
  screenshot_url: string;
  tags: string[];
  category_id: number;
  category_name: string;
  category_color: string;
  is_favorite: boolean;
  display_order: number;
  metadata_status: string;
  created_at: string;
  updated_at: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [isShareSupported, setIsShareSupported] = useState(false);
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(
    null
  );
  const [isSending, setIsSending] = useState(false);
  const [savedTool, setSavedTool] = useState<SavedTool | null>(null);

  useEffect(() => {
    // Check for shared content in URL
    const sharedTitle = searchParams.get("shared_title");
    const sharedText = searchParams.get("shared_text");
    const sharedUrl = searchParams.get("shared_url");
    const sharedFiles = searchParams.get("shared_files");
    const sharedStatus = searchParams.get("shared_status") as
      | "success"
      | "error"
      | "pending"
      | null;
    const sharedError = searchParams.get("shared_error");
    const sharedDetails = searchParams.get("shared_details");
    const sharedTags = searchParams.get("shared_tags");

    if (sharedTitle || sharedText || sharedUrl || sharedFiles || sharedStatus) {
      const content: SharedContent = {
        title: sharedTitle || undefined,
        text: sharedText || undefined,
        url: sharedUrl || undefined,
        filesCount: sharedFiles ? parseInt(sharedFiles, 10) : undefined,
        status: sharedStatus || undefined,
        error: sharedError || undefined,
        details: sharedDetails || undefined,
        tags: sharedTags ? sharedTags.split(",") : undefined,
      };
      setSharedContent(content);
    }
  }, [searchParams]);

  const handleSendTool = async () => {
    if (!sharedContent?.url) return;

    setIsSending(true);
    try {
      // Build payload with new schema - only URL, category_id, tags, is_favorite
      const payload = {
        url: sharedContent.url,
        category_id: 0, // Default category
        tags: sharedContent.tags || [],
        is_favorite: false,
      };

      const response = await fetch("/api/tools/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setSharedContent({
          ...sharedContent,
          status: "error",
          error: result.error || `HTTP ${response.status}`,
          details: result.details,
        });
      } else {
        // Store the saved tool data from API response
        setSavedTool(result.data);
        setSharedContent({
          ...sharedContent,
          status: "success",
        });
      }
    } catch (error) {
      setSharedContent({
        ...sharedContent,
        status: "error",
        error: "SEND_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Check if share API is supported
    setIsShareSupported(!!navigator.share);

    // Check notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: "HomeLab PWA",
        text: "Check out this awesome PWA!",
        url: window.location.href,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Notifications not supported in this browser");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        // Register for push notifications
        const registration = await navigator.serviceWorker.ready;

        // For demo purposes, show a local notification
        registration.showNotification("HomeLab PWA", {
          body: "Push notifications enabled!",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        });
      }
    } catch (err) {
      console.error("Failed to enable notifications:", err);
    }
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== "granted") return;

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("Test Notification", {
        body: "This is a test notification from HomeLab PWA",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: "test-notification",
        requireInteraction: false,
      });
    } catch (err) {
      console.error("Failed to show notification:", err);
    }
  };

  const handleDismissShared = () => {
    setSharedContent(null);
    setSavedTool(null);
    // Clear URL params
    window.history.replaceState({}, "", "/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            HomeLab
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Progressive Web App
          </p>
        </div>

        {/* Pending state - show preview card with URL */}
        {sharedContent && sharedContent.status === "pending" && (
          <div className="w-full rounded-xl border bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Save Tool
              </h2>
              <button
                onClick={handleDismissShared}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* URL display */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {sharedContent.title ||
                      new URL(sharedContent.url!).hostname}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {sharedContent.url}
                  </p>
                </div>
              </div>

              {/* Description from share text */}
              {sharedContent.text && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {sharedContent.text}
                </p>
              )}

              {/* Tags */}
              {sharedContent.tags && sharedContent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sharedContent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Info note */}
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Metadata will be fetched automatically after saving
              </p>
            </div>

            {/* Send button */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSendTool}
                disabled={isSending}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Tool"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success state - show saved tool from API response */}
        {sharedContent && sharedContent.status === "success" && savedTool && (
          <div className="w-full rounded-xl border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b border-green-200 dark:border-green-800">
              <h2 className="text-sm font-semibold text-green-800 dark:text-green-200">
                Tool Saved Successfully
              </h2>
              <button
                onClick={handleDismissShared}
                className="text-green-600 dark:text-green-400 hover:opacity-70"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Header with logo and title */}
              <div className="flex items-start gap-3">
                {savedTool.logo_url && (
                  <img
                    src={savedTool.logo_url}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-zinc-800 p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 truncate">
                    {savedTool.name}
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-400 truncate">
                    {savedTool.url}
                  </p>
                </div>
              </div>

              {/* Description */}
              {savedTool.description && (
                <p className="text-sm text-green-700 dark:text-green-300 line-clamp-2">
                  {savedTool.description}
                </p>
              )}

              {/* Category badge */}
              {savedTool.category_name && (
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                    style={{
                      backgroundColor: savedTool.category_color || "#6b7280",
                    }}
                  >
                    {savedTool.category_name}
                  </span>
                  {savedTool.is_favorite && (
                    <span className="text-yellow-500">★</span>
                  )}
                </div>
              )}

              {/* Tags */}
              {savedTool.tags && savedTool.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {savedTool.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata status */}
              <p className="text-xs text-green-600 dark:text-green-400">
                ID: {savedTool.id} • Status: {savedTool.metadata_status}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {sharedContent && sharedContent.status === "error" && (
          <div className="w-full p-4 rounded-xl border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">
                Failed to Save Tool
              </h2>
              <button
                onClick={handleDismissShared}
                className="text-red-600 dark:text-red-400 hover:opacity-70"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
              {sharedContent.url && (
                <p>
                  <strong>URL:</strong>{" "}
                  <a href={sharedContent.url} className="underline break-all">
                    {sharedContent.url}
                  </a>
                </p>
              )}
              {sharedContent.error && (
                <p className="mt-2 font-mono text-xs">
                  <strong>Error:</strong> {sharedContent.error}
                </p>
              )}
              {sharedContent.details && (
                <p className="font-mono text-xs break-all">
                  <strong>Details:</strong> {sharedContent.details}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full">
          {isInstallable && (
            <button
              onClick={handleInstall}
              className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-white font-medium transition-colors hover:bg-blue-700"
            >
              Install App
            </button>
          )}

          {isShareSupported && (
            <button
              onClick={handleShare}
              className="flex h-12 w-full items-center justify-center rounded-full bg-green-600 px-5 text-white font-medium transition-colors hover:bg-green-700"
            >
              Share App
            </button>
          )}

          {notificationPermission === "default" && (
            <button
              onClick={handleEnableNotifications}
              className="flex h-12 w-full items-center justify-center rounded-full bg-purple-600 px-5 text-white font-medium transition-colors hover:bg-purple-700"
            >
              Enable Notifications
            </button>
          )}

          {notificationPermission === "granted" && (
            <button
              onClick={handleTestNotification}
              className="flex h-12 w-full items-center justify-center rounded-full bg-purple-600 px-5 text-white font-medium transition-colors hover:bg-purple-700"
            >
              Test Notification
            </button>
          )}

          {notificationPermission === "denied" && (
            <p className="text-center text-sm text-red-500">
              Notifications blocked. Enable in browser settings.
            </p>
          )}
        </div>

        <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>Features:</p>
          <ul className="mt-2 space-y-1">
            <li>✓ Installable PWA</li>
            <li>✓ Share Sheet (Android)</li>
            <li>✓ Receive Shared Content</li>
            <li>✓ Push Notifications</li>
            <li>✓ Offline Support</li>
          </ul>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-600">0.5.3</p>
      </main>

      <DebugPanel
        lastError={sharedContent?.error}
        lastApiResponse={sharedContent?.details}
        sharePayload={
          sharedContent
            ? {
                title: sharedContent.title,
                text: sharedContent.text,
                url: sharedContent.url,
              }
            : null
        }
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
