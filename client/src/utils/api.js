export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const ADMIN_TOKEN_KEY = "mota-bhai-admin-token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

export function applyThemeConfig(themeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--primary-color", themeConfig.primaryColor || "#d4af37");
  root.style.setProperty("--button-color", themeConfig.buttonColor || "#d4af37");
  root.style.setProperty("--background-color", themeConfig.backgroundColor || "#050914");
  root.style.setProperty("--surface-color", themeConfig.surfaceColor || "#0b1224");
  root.style.setProperty("--logo-url", `url("${themeConfig.logoUrl || ""}")`);
}
