const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export function getToken() {
  return localStorage.getItem("splitpilot_token");
}

export function setToken(token) {
  localStorage.setItem("splitpilot_token", token);
}

export function getStoredUser() {
  const value = localStorage.getItem("splitpilot_user");
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession({ token, user }) {
  localStorage.setItem("splitpilot_token", token);
  localStorage.setItem("splitpilot_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("splitpilot_token");
  localStorage.removeItem("splitpilot_user");
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
