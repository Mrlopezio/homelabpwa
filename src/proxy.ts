import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TINYAUTH_URL = process.env.TINYAUTH_URL || "https://auth.mrlopez.io";
const SESSION_COOKIE_NAME = "tinyauth";

// Routes that require authentication
const PROTECTED_API_ROUTES = ["/api/tools/send", "/api/tools/fetch-meta"];

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  "/api/auth/me",
  "/api/debug",
  "/share-target",
  "/_next",
  "/icons",
  "/manifest.json",
  "/favicon.ico",
  "/sw.js",
  "/workbox-",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if this is a protected API route
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Get the session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // For protected API routes, verify authentication
  if (isProtectedApi) {
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify with TinyAuth
    try {
      const authResponse = await fetch(`${TINYAUTH_URL}/api/auth/nginx`, {
        method: "GET",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
        },
        redirect: "manual",
      });

      if (!authResponse.ok && authResponse.status !== 200) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Invalid or expired session" },
          { status: 401 }
        );
      }

      // Add user info to request headers for downstream use
      const response = NextResponse.next();
      const email =
        authResponse.headers.get("Remote-User") ||
        authResponse.headers.get("Remote-Email");
      const name = authResponse.headers.get("Remote-Name");

      if (email) {
        response.headers.set("x-user-email", email);
      }
      if (name) {
        response.headers.set("x-user-name", name);
      }

      return response;
    } catch (error) {
      console.error("[middleware] Auth verification failed:", error);
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication service unavailable",
        },
        { status: 503 }
      );
    }
  }

  // For the main page, we don't force redirect - let the UI handle it
  // This allows the page to show a login button instead of redirecting
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
