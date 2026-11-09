import { io } from "socket.io-client";

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const localAdminApi = {
  me: () => request("/api/auth/me"),
  login: (username, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  verifyPin: async () => ({ ok: true }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
};

export const localVisitorsApi = {
  list: (params = {}) => request(`/api/visitors${queryString(params)}`),
  summary: () => request("/api/visitors/summary"),
  suggestions: (query, limit = 12) =>
    request(`/api/visitors/suggestions${queryString({ q: query, limit })}`),
  get: (id) => request(`/api/visitors/${encodeURIComponent(id)}`),
  create: async (visitor, photo) => {
    const form = new FormData();
    form.append("visitor", JSON.stringify(visitor));
    if (photo) form.append("photo", photo, "visitor.jpg");
    return request("/api/visitors", { method: "POST", body: form });
  },
  update: (id, values) =>
    request(`/api/visitors/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    }),
  remove: (id) =>
    request(`/api/visitors/${encodeURIComponent(id)}`, { method: "DELETE" }),
  removeMany: (ids) =>
    request("/api/visitors/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  subscribe: (callback) => {
    const socket = io({ withCredentials: true });
    socket.on("visitors:change", callback);
    socket.on("connect_error", (error) => console.warn("Realtime connection failed", error.message));
    return () => socket.disconnect();
  },
};
