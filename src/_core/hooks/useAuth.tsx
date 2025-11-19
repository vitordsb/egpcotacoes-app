import { http } from "@/lib/http";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthContextValue = {
  user: any | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<any | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistUser(data: any | null) {
  if (typeof window === "undefined") return;
  if (data) {
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(data));
  } else {
    localStorage.removeItem("manus-runtime-user-info");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    persistUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await http.get("/api/auth/me");
      setUser(data);
      persistUser(data);
      return data;
    } catch (err) {
      if (err instanceof Error && err.message === "Please login (10001)") {
        handleUnauthorized();
        return null;
      }
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    fetchMe().catch(() => {
      /* handled in fetchMe */
    });
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await http.post("/api/auth/logout");
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Please login (10001)")
        return;
      throw error;
    } finally {
      handleUnauthorized();
    }
  }, [handleUnauthorized]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refresh: fetchMe,
      logout,
    };
  }, [user, loading, error, fetchMe, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(options?: UseAuthOptions) {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};

  const { loading, user } = context;

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, user]);

  return context;
}
