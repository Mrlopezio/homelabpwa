"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
  userAgent: string;
  standalone: boolean;
  serviceWorker: "supported" | "not-supported" | "registered" | "error";
  notification: NotificationPermission | "not-supported";
  share: boolean;
  shareTarget: boolean;
  online: boolean;
  timestamp: string;
}

interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

interface DebugPanelProps {
  lastError?: string | null;
  lastApiResponse?: string | null;
  sharePayload?: SharePayload | null;
}

export function DebugPanel({
  lastError,
  lastApiResponse,
  sharePayload,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [envCheck, setEnvCheck] = useState<{
    checking: boolean;
    result?: { hasApiUrl: boolean; hasApiKey: boolean; error?: string };
  }>({ checking: false });

  useEffect(() => {
    const info: DebugInfo = {
      userAgent: navigator.userAgent,
      standalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true,
      serviceWorker:
        "serviceWorker" in navigator ? "supported" : "not-supported",
      notification:
        "Notification" in window ? Notification.permission : "not-supported",
      share: !!navigator.share,
      shareTarget: true, // Assumed if manifest is configured
      online: navigator.onLine,
      timestamp: new Date().toISOString(),
    };

    // Check service worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setDebugInfo((prev) => ({
          ...prev!,
          serviceWorker: reg ? "registered" : "supported",
        }));
      });
    }

    setDebugInfo(info);

    // Listen for online/offline
    const handleOnline = () =>
      setDebugInfo((prev) => (prev ? { ...prev, online: true } : prev));
    const handleOffline = () =>
      setDebugInfo((prev) => (prev ? { ...prev, online: false } : prev));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkEnvVariables = async () => {
    setEnvCheck({ checking: true });
    try {
      const response = await fetch("/api/debug/env-check");
      const data = await response.json();
      setEnvCheck({ checking: false, result: data });
    } catch (error) {
      setEnvCheck({
        checking: false,
        result: { hasApiUrl: false, hasApiKey: false, error: String(error) },
      });
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch("/api/debug/test-api");
      const data = await response.json();
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      alert(`Test failed: ${error}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-zinc-800 text-white rounded-full text-xs font-mono flex items-center justify-center shadow-lg hover:bg-zinc-700"
      >
        DBG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-auto p-4">
      <div className="max-w-lg mx-auto bg-zinc-900 rounded-xl p-4 text-white font-mono text-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Debug Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* System Info */}
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">
            System Info
          </h3>
          <div className="space-y-1 bg-zinc-800 p-2 rounded">
            <div className="flex justify-between">
              <span>Online:</span>
              <span
                className={
                  debugInfo?.online ? "text-green-400" : "text-red-400"
                }
              >
                {debugInfo?.online ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Standalone Mode:</span>
              <span
                className={
                  debugInfo?.standalone ? "text-green-400" : "text-yellow-400"
                }
              >
                {debugInfo?.standalone ? "Yes (PWA)" : "No (Browser)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Service Worker:</span>
              <span
                className={
                  debugInfo?.serviceWorker === "registered"
                    ? "text-green-400"
                    : debugInfo?.serviceWorker === "supported"
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {debugInfo?.serviceWorker}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Notifications:</span>
              <span
                className={
                  debugInfo?.notification === "granted"
                    ? "text-green-400"
                    : debugInfo?.notification === "denied"
                    ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {debugInfo?.notification}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Web Share API:</span>
              <span
                className={debugInfo?.share ? "text-green-400" : "text-red-400"}
              >
                {debugInfo?.share ? "Supported" : "Not Supported"}
              </span>
            </div>
          </div>
        </section>

        {/* Environment Check */}
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">
            Environment
          </h3>
          <div className="space-y-2">
            <button
              onClick={checkEnvVariables}
              disabled={envCheck.checking}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-3 py-2 rounded"
            >
              {envCheck.checking ? "Checking..." : "Check Env Variables"}
            </button>
            {envCheck.result && (
              <div className="bg-zinc-800 p-2 rounded space-y-1">
                <div className="flex justify-between">
                  <span>TOOLS_API_URL:</span>
                  <span
                    className={
                      envCheck.result.hasApiUrl
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {envCheck.result.hasApiUrl ? "Set" : "Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TOOLS_API_KEY:</span>
                  <span
                    className={
                      envCheck.result.hasApiKey
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {envCheck.result.hasApiKey ? "Set" : "Missing"}
                  </span>
                </div>
                {envCheck.result.error && (
                  <div className="text-red-400 break-all">
                    {envCheck.result.error}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={testApiConnection}
              className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded"
            >
              Test API Connection
            </button>
          </div>
        </section>

        {/* Received Share Payload */}
        {sharePayload && (
          <section className="mb-4">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">
              Received Share Payload
            </h3>
            <div className="bg-zinc-800 p-2 rounded space-y-2">
              <div>
                <span className="text-zinc-500">title:</span>
                <div className="text-cyan-300 break-all">
                  {sharePayload.title || (
                    <span className="text-zinc-600">(empty)</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-zinc-500">text:</span>
                <div className="text-cyan-300 break-all">
                  {sharePayload.text || (
                    <span className="text-zinc-600">(empty)</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-zinc-500">url:</span>
                <div className="text-cyan-300 break-all">
                  {sharePayload.url || (
                    <span className="text-zinc-600">(empty)</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Last Error */}
        {lastError && (
          <section className="mb-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">
              Last Error
            </h3>
            <div className="bg-red-900/50 p-2 rounded break-all">
              {lastError}
            </div>
          </section>
        )}

        {/* Last API Response */}
        {lastApiResponse && (
          <section className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">
              Last API Response
            </h3>
            <div className="bg-zinc-800 p-2 rounded break-all whitespace-pre-wrap">
              {lastApiResponse}
            </div>
          </section>
        )}

        {/* User Agent */}
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">
            User Agent
          </h3>
          <div className="bg-zinc-800 p-2 rounded break-all text-[10px]">
            {debugInfo?.userAgent}
          </div>
        </section>

        {/* Timestamp */}
        <div className="text-zinc-500 text-center">
          Debug loaded: {debugInfo?.timestamp}
        </div>
      </div>
    </div>
  );
}
