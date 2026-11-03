
export const API =
  import.meta.env.VITE_API_URL ||
  "https://stockwise-backend-m8aw.onrender.com";

const REQUEST_TIMEOUT_MS = 15000;

export function authHeaders() {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function normalizeEndpoint(endpoint) {
  let path = String(endpoint || "");

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (!path.startsWith("/api/") && path !== "/api") {
    path = `/api${path}`;
  }

  return path;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const path = normalizeEndpoint(endpoint);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        message: text || "Invalid server response.",
      };
    }

    if (!response.ok) {
      const isAuthRoute = path.startsWith("/api/auth/");

      if (response.status === 401 && token && !isAuthRoute) {
        clearSession();
        window.location.reload();
      }

      throw new Error(
        data.message || `Server returned status ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("StockWise API error:", error);

    if (error.name === "AbortError") {
      throw new Error(
        "The server took too long to respond. Please try again."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to connect to StockWise server. Make sure the backend is running on ${API}.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const get = (endpoint) => apiRequest(endpoint);

export const post = (endpoint, body) =>
  apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const put = (endpoint, body) =>
  apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const del = (endpoint) =>
  apiRequest(endpoint, { method: "DELETE" });
