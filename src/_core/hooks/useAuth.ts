import { http } from "@/lib/http";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await http.get("/api/auth/me");
      setUser(data);
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(data));
      return data;
    } catch (err) {
      if (err instanceof Error && err.message === "Please login (10001)") {
        setUser(null);
        return null;
      }
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
      setUser(null);
      localStorage.removeItem("manus-runtime-user-info");
    }
  }, []);

  const state = useMemo(() => {
    return {
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
    };
  }, [user, loading, error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: fetchMe,
    logout,
  };
}
