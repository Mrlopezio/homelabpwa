import { cookies } from "next/headers";

export interface TinyAuthUser {
  email: string;
  name?: string;
  groups?: string[];
}

export interface AuthResult {
  authenticated: boolean;
  user: TinyAuthUser | null;
}

const TINYAUTH_URL = process.env.TINYAUTH_URL || "https://auth.mrlopez.io";

// TinyAuth session cookie name (default is "tinyauth")
const SESSION_COOKIE_NAME = "tinyauth";

/**
 * Verify the current session with TinyAuth server-side.
 * This function should be called from Server Components or API routes.
 */
export async function verifySession(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return { authenticated: false, user: null };
    }

    // Call TinyAuth's verification endpoint
    // Using /api/auth/nginx which returns user info in headers on success
    const response = await fetch(`${TINYAUTH_URL}/api/me`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      // Don't follow redirects - we want to handle auth failures
      redirect: "manual",
      // Cache for a short period to avoid hammering TinyAuth
      next: { revalidate: 30 },
    });

    // TinyAuth returns 200 on success with user info
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        authenticated: true,
        user: {
          email: data.email || data.username || "unknown",
          name: data.name || data.username,
          groups: data.groups || [],
        },
      };
    }

    // Try the nginx auth endpoint as fallback (returns user info in headers)
    const nginxResponse = await fetch(`${TINYAUTH_URL}/api/auth/nginx`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      redirect: "manual",
    });

    if (nginxResponse.ok || nginxResponse.status === 200) {
      // Extract user info from headers
      const email = nginxResponse.headers.get("Remote-User") || 
                    nginxResponse.headers.get("Remote-Email");
      const name = nginxResponse.headers.get("Remote-Name");
      const groups = nginxResponse.headers.get("Remote-Groups")?.split(",") || [];

      if (email) {
        return {
          authenticated: true,
          user: { email, name: name || undefined, groups },
        };
      }
    }

    return { authenticated: false, user: null };
  } catch (error) {
    console.error("[auth] Session verification error:", error);
    return { authenticated: false, user: null };
  }
}

/**
 * Get the TinyAuth login URL with redirect back to the app
 */
export function getLoginUrl(returnTo?: string): string {
  const returnUrl = returnTo || "/";
  // TinyAuth will redirect back to this URL after login
  return `${TINYAUTH_URL}?redirect=${encodeURIComponent(returnUrl)}`;
}

/**
 * Get the TinyAuth logout URL
 */
export function getLogoutUrl(returnTo?: string): string {
  const returnUrl = returnTo || "/";
  return `${TINYAUTH_URL}/api/logout?redirect=${encodeURIComponent(returnUrl)}`;
}

/**
 * Check if a request has a valid TinyAuth session (for middleware/API routes)
 */
export async function isAuthenticated(cookieHeader?: string): Promise<boolean> {
  if (!cookieHeader) return false;

  // Parse the cookie header to find the session cookie
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const sessionValue = cookies[SESSION_COOKIE_NAME];
  if (!sessionValue) return false;

  try {
    const response = await fetch(`${TINYAUTH_URL}/api/auth/nginx`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionValue}`,
      },
      redirect: "manual",
    });

    return response.ok || response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get user info from cookie header (for middleware/API routes)
 */
export async function getUserFromCookie(cookieHeader?: string): Promise<TinyAuthUser | null> {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const sessionValue = cookies[SESSION_COOKIE_NAME];
  if (!sessionValue) return null;

  try {
    // Try /api/me first
    const meResponse = await fetch(`${TINYAUTH_URL}/api/me`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionValue}`,
      },
      redirect: "manual",
    });

    if (meResponse.ok) {
      const data = await meResponse.json().catch(() => ({}));
      return {
        email: data.email || data.username || "unknown",
        name: data.name || data.username,
        groups: data.groups || [],
      };
    }

    // Fallback to nginx auth endpoint
    const nginxResponse = await fetch(`${TINYAUTH_URL}/api/auth/nginx`, {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionValue}`,
      },
      redirect: "manual",
    });

    if (nginxResponse.ok) {
      const email = nginxResponse.headers.get("Remote-User") || 
                    nginxResponse.headers.get("Remote-Email");
      const name = nginxResponse.headers.get("Remote-Name");
      const groups = nginxResponse.headers.get("Remote-Groups")?.split(",") || [];

      if (email) {
        return { email, name: name || undefined, groups };
      }
    }

    return null;
  } catch {
    return null;
  }
}
