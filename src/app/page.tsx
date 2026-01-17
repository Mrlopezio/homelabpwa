"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface SharedContent {
  title?: string;
  text?: string;
  url?: string;
  filesCount?: number;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isShareSupported, setIsShareSupported] = useState(false);
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);

  useEffect(() => {
    // Check for shared content in URL
    const sharedTitle = searchParams.get("shared_title");
    const sharedText = searchParams.get("shared_text");
    const sharedUrl = searchParams.get("shared_url");
    const sharedFiles = searchParams.get("shared_files");

    if (sharedTitle || sharedText || sharedUrl || sharedFiles) {
      setSharedContent({
        title: sharedTitle || undefined,
        text: sharedText || undefined,
        url: sharedUrl || undefined,
        filesCount: sharedFiles ? parseInt(sharedFiles, 10) : undefined,
      });
    }
  }, [searchParams]);

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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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

        {sharedContent && (
          <div className="w-full p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Shared Content Received
              </h2>
              <button
                onClick={handleDismissShared}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              {sharedContent.title && <p><strong>Title:</strong> {sharedContent.title}</p>}
              {sharedContent.text && <p><strong>Text:</strong> {sharedContent.text}</p>}
              {sharedContent.url && (
                <p>
                  <strong>URL:</strong>{" "}
                  <a href={sharedContent.url} className="underline break-all">
                    {sharedContent.url}
                  </a>
                </p>
              )}
              {sharedContent.filesCount && (
                <p><strong>Files:</strong> {sharedContent.filesCount} file(s)</p>
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
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
