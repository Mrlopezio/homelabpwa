"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface User {
  email: string;
  name?: string;
  groups?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: (returnTo?: string) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TINYAUTH_URL = process.env.NEXT_PUBLIC_TINYAUTH_URL || "https://auth.mrlopez.io";

export function AuthProvider({ 
  children,
  initialUser,
}: { 
  children: ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      // Call our own API endpoint to check auth status
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("[auth-context] Failed to refresh auth:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we don't have initial user data
    if (!initialUser) {
      refresh();
    }
  }, [initialUser, refresh]);

  const login = useCallback((returnTo?: string) => {
    const currentUrl = returnTo || window.location.href;
    // Redirect to TinyAuth login page
    window.location.href = `${TINYAUTH_URL}?redirect=${encodeURIComponent(currentUrl)}`;
  }, []);

  const logout = useCallback((returnTo?: string) => {
    const returnUrl = returnTo || window.location.origin;
    // Redirect to TinyAuth logout endpoint
    window.location.href = `${TINYAUTH_URL}/api/logout?redirect=${encodeURIComponent(returnUrl)}`;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook that requires authentication.
 * Automatically redirects to login if not authenticated.
 */
export function useRequireAuth(redirectTo?: string) {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.login(redirectTo);
    }
  }, [auth, redirectTo]);

  return auth;
}
