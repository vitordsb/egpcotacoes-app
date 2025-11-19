const API_BASE =import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...(init ?? {}),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      errorMessage = data.error || JSON.stringify(data);
    } catch {
      // ignore
    }
    if (response.status === 401) {
      errorMessage = "Please login (10001)";
    }
    throw new Error(errorMessage || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};
